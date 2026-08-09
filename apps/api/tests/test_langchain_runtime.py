"""
test_langchain_runtime.py

Regression tests for QurioDB's LangChain provider runtime, OpenAI-compatible
provider selection, and provider-safe AI service fallback behavior.
"""

import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import services.ai.langchain_runtime as runtime
from models import AIModel, Base
from services.ai.langchain_runtime import (
    get_ai_api_key,
    infer_provider_from_model_id,
    langchain_runtime,
    resolve_base_url,
)
from services.ai.base import BaseAIService

pytestmark = pytest.mark.rag


class FakeHTTPResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def test_infer_provider_from_model_id():
    assert infer_provider_from_model_id("gpt-4o-mini") == "openai"
    assert infer_provider_from_model_id("gemini-2.5-flash") == "google"
    assert infer_provider_from_model_id("claude-3-5-haiku-latest") == "anthropic"
    assert infer_provider_from_model_id("qwen-plus") == "qwen"
    assert infer_provider_from_model_id("deepseek-chat") == "deepseek"


@pytest.mark.parametrize(
    ("provider", "base_url"),
    [
        ("9router", "http://127.0.0.1:20128/v1/"),
        ("qwen", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/"),
    ],
)
def test_list_available_models_uses_resolved_url_and_bearer_key(monkeypatch, provider, base_url):
    subject = runtime.LangChainRuntime()
    observed = {}
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: f"secret-{provider}")
    monkeypatch.setattr(runtime, "resolve_base_url", lambda provider, user_id=None: base_url)

    def fake_urlopen(request, timeout):
        observed["url"] = request.full_url
        observed["authorization"] = request.get_header("Authorization")
        observed["timeout"] = timeout
        return FakeHTTPResponse({"data": [
            {"id": "model-a"},
            {"id": "model-a"},
            {"id": "model-b", "capabilities": {"chat_completion": True}},
            {"id": "embedding-model", "capabilities": {"chat_completion": False}},
            {"id": ""},
        ]})

    monkeypatch.setattr(runtime, "urlopen", fake_urlopen)

    assert subject.list_available_models(provider, "user-1") == ["model-a", "model-b"]
    assert observed == {
        "url": f"{base_url.rstrip('/')}/models",
        "authorization": f"Bearer secret-{provider}",
        "timeout": 5,
    }


def test_openai_is_inventory_compatible():
    subject = runtime.LangChainRuntime()
    assert subject.is_openai_compatible_provider("OpenAI") is True
    assert subject.is_openai_compatible_provider("Google") is False
    assert subject.is_openai_compatible_provider("Anthropic") is False


def test_model_inventory_cache_expires_after_sixty_seconds(monkeypatch):
    subject = runtime.LangChainRuntime()
    now = [100.0]
    calls = []
    monkeypatch.setattr(runtime.time, "monotonic", lambda: now[0])
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "secret")
    monkeypatch.setattr(runtime, "resolve_base_url", lambda provider, user_id=None: "http://gateway.test/v1")
    monkeypatch.setattr(
        runtime,
        "urlopen",
        lambda request, timeout: calls.append(request.full_url) or FakeHTTPResponse({"data": [{"id": "model-a"}]}),
    )

    assert subject.list_available_models("9router", "user-1") == ["model-a"]
    now[0] = 159.9
    assert subject.list_available_models("9router", "user-1") == ["model-a"]
    now[0] = 160.0
    assert subject.list_available_models("9router", "user-1") == ["model-a"]
    assert calls == ["http://gateway.test/v1/models", "http://gateway.test/v1/models"]


def test_model_inventory_ttl_starts_after_response_parsing(monkeypatch):
    subject = runtime.LangChainRuntime()
    now = [100.0]
    calls = []
    monkeypatch.setattr(runtime.time, "monotonic", lambda: now[0])
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "secret")
    monkeypatch.setattr(runtime, "resolve_base_url", lambda provider, user_id=None: "http://gateway.test/v1")

    def fake_urlopen(request, timeout):
        calls.append(request.full_url)
        if len(calls) == 1:
            now[0] = 130.0
        return FakeHTTPResponse({"data": [{"id": "model-a"}]})

    monkeypatch.setattr(runtime, "urlopen", fake_urlopen)

    assert subject.list_available_models("9router", "user-1") == ["model-a"]
    now[0] = 189.9
    assert subject.list_available_models("9router", "user-1") == ["model-a"]
    assert calls == ["http://gateway.test/v1/models"]
    now[0] = 190.0
    assert subject.list_available_models("9router", "user-1") == ["model-a"]
    assert calls == ["http://gateway.test/v1/models", "http://gateway.test/v1/models"]


def test_model_inventory_cache_isolated_by_user_provider_and_base_url(monkeypatch):
    subject = runtime.LangChainRuntime()
    calls = []
    current_base_url = ["http://gateway.test/v1"]
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "secret-value")
    monkeypatch.setattr(runtime, "resolve_base_url", lambda provider, user_id=None: current_base_url[0])

    def fake_urlopen(request, timeout):
        calls.append(request.full_url)
        return FakeHTTPResponse({"data": [{"id": "model-a"}]})

    monkeypatch.setattr(runtime, "urlopen", fake_urlopen)

    subject.list_available_models("9 Router", "user-1")
    subject.list_available_models("9router", "user-1")
    subject.list_available_models("9router", "user-2")
    current_base_url[0] = "http://other-gateway.test/v1"
    subject.list_available_models("9router", "user-1")

    assert calls == [
        "http://gateway.test/v1/models",
        "http://gateway.test/v1/models",
        "http://other-gateway.test/v1/models",
    ]
    assert all("secret-value" not in repr(key) and "secret-value" not in repr(value)
               for key, value in subject._model_inventory_cache.items())


def test_empty_model_inventory_is_not_cached(monkeypatch):
    subject = runtime.LangChainRuntime()
    calls = []
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "secret")
    monkeypatch.setattr(runtime, "resolve_base_url", lambda provider, user_id=None: "http://gateway.test/v1")

    def fake_urlopen(request, timeout):
        calls.append(request.full_url)
        return FakeHTTPResponse({"data": []})

    monkeypatch.setattr(runtime, "urlopen", fake_urlopen)
    with pytest.raises(RuntimeError, match="no usable models"):
        subject.list_available_models("9router", "user-1")
    with pytest.raises(RuntimeError, match="no usable models"):
        subject.list_available_models("9router", "user-1")
    assert calls == ["http://gateway.test/v1/models", "http://gateway.test/v1/models"]


def test_failed_model_inventory_is_not_cached(monkeypatch):
    subject = runtime.LangChainRuntime()
    calls = []
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "secret")
    monkeypatch.setattr(runtime, "resolve_base_url", lambda provider, user_id=None: "http://gateway.test/v1")

    def fail_urlopen(request, timeout):
        calls.append(request.full_url)
        raise RuntimeError("inventory unavailable")

    monkeypatch.setattr(runtime, "urlopen", fail_urlopen)
    with pytest.raises(RuntimeError, match="inventory unavailable"):
        subject.list_available_models("9router", "user-1")
    with pytest.raises(RuntimeError, match="inventory unavailable"):
        subject.list_available_models("9router", "user-1")
    assert calls == ["http://gateway.test/v1/models", "http://gateway.test/v1/models"]


def test_select_auto_model_stops_on_first_success_within_three_attempts(monkeypatch):
    subject = runtime.LangChainRuntime()
    probes = []
    monkeypatch.setattr(subject, "list_available_models", lambda provider, user_id=None: ["model-a", "model-b", "model-c", "model-d"])
    monkeypatch.setattr(runtime.random, "shuffle", lambda values: None)

    def probe(model_id, user_id, provider):
        probes.append(model_id)
        if model_id != "model-b":
            raise RuntimeError("unavailable")

    monkeypatch.setattr(subject, "_probe_model_access", probe)

    assert subject.select_auto_model("9router", "user-1") == {"provider": "9router", "model": "model-b"}
    assert probes == ["model-a", "model-b"]


def test_select_auto_model_limits_failures_to_three_unique_models(monkeypatch):
    subject = runtime.LangChainRuntime()
    probes = []
    monkeypatch.setattr(
        subject,
        "list_available_models",
        lambda provider, user_id=None: ["model-a", "model-a", "model-b", "model-c", "model-c", "model-d"],
    )
    monkeypatch.setattr(runtime.random, "shuffle", lambda values: None)
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "never-expose-this-key")

    def fail_probe(model_id, user_id, provider):
        probes.append(model_id)
        raise RuntimeError("credential never-expose-this-key rejected")

    monkeypatch.setattr(subject, "_probe_model_access", fail_probe)

    with pytest.raises(RuntimeError) as error:
        subject.select_auto_model("9router", "user-1")

    assert probes == ["model-a", "model-b", "model-c"]
    assert str(error.value).startswith("Auto model selection failed for provider 9router after 3 attempts:")
    assert "never-expose-this-key" not in str(error.value)


def test_select_auto_model_uses_default_once_when_inventory_fails(monkeypatch):
    subject = runtime.LangChainRuntime()
    probes = []
    monkeypatch.setattr(subject, "list_available_models", lambda provider, user_id=None: (_ for _ in ()).throw(RuntimeError("404 models")))
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "secret")
    monkeypatch.setattr(subject, "_probe_model_access", lambda model_id, user_id, provider: probes.append(model_id))

    assert subject.select_auto_model("9router", "user-1") == {
        "provider": "9router",
        "model": "cc/claude-sonnet-4.5",
    }
    assert probes == ["cc/claude-sonnet-4.5"]


def test_select_auto_model_sanitizes_inventory_and_default_failure(monkeypatch):
    subject = runtime.LangChainRuntime()
    probes = []
    monkeypatch.setattr(subject, "list_available_models", lambda provider, user_id=None: (_ for _ in ()).throw(RuntimeError("404 models")))
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "never-expose-this-key")

    def fail_probe(model_id, user_id, provider):
        probes.append(model_id)
        raise RuntimeError(
            "Error code: 404 - {'error': {'message': 'credential never-expose-this-key rejected'}}"
        )

    monkeypatch.setattr(subject, "_probe_model_access", fail_probe)

    with pytest.raises(RuntimeError) as error:
        subject.select_auto_model("9router", "user-1")

    message = str(error.value)
    assert message.startswith("Auto model inventory failed for provider 9router:")
    assert "default model preflight failed:" in message
    assert "never-expose-this-key" not in message
    assert probes == ["cc/claude-sonnet-4.5"]


@pytest.mark.parametrize(
    "inventory_response",
    [
        RuntimeError("inventory unavailable"),
        {"unexpected": []},
        {"data": []},
    ],
)
def test_select_auto_model_uses_default_once_for_inventory_compatibility_fallback(monkeypatch, inventory_response):
    subject = runtime.LangChainRuntime()
    probes = []
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "secret-value")
    monkeypatch.setattr(runtime, "resolve_base_url", lambda provider, user_id=None: "http://gateway.test/v1")

    def fake_urlopen(request, timeout):
        if isinstance(inventory_response, Exception):
            raise inventory_response
        return FakeHTTPResponse(inventory_response)

    monkeypatch.setattr(runtime, "urlopen", fake_urlopen)
    monkeypatch.setattr(
        subject,
        "_probe_model_access",
        lambda model_id, user_id, provider: probes.append((model_id, provider)),
    )

    assert subject.select_auto_model("9router", "user-1") == {
        "provider": "9router",
        "model": "cc/claude-sonnet-4.5",
    }
    assert probes == [("cc/claude-sonnet-4.5", "9router")]


@pytest.mark.parametrize(
    "inventory_response",
    [
        RuntimeError("inventory unavailable: secret-value"),
        {"unexpected": [{"body": "upstream-secret-body"}]},
        {"data": []},
    ],
)
def test_select_auto_model_reports_distinct_redacted_inventory_and_default_failures(
    monkeypatch, inventory_response
):
    subject = runtime.LangChainRuntime()
    probes = []
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "secret-value")
    monkeypatch.setattr(runtime, "resolve_base_url", lambda provider, user_id=None: "http://gateway.test/v1")

    def fake_urlopen(request, timeout):
        if isinstance(inventory_response, Exception):
            raise inventory_response
        return FakeHTTPResponse(inventory_response)

    monkeypatch.setattr(runtime, "urlopen", fake_urlopen)

    def fail_probe(model_id, user_id, provider):
        probes.append((model_id, provider))
        raise RuntimeError("default preflight failed: secret-value {'upstream-secret-body': true}")

    monkeypatch.setattr(subject, "_probe_model_access", fail_probe)

    with pytest.raises(RuntimeError) as error:
        subject.select_auto_model("9router", "user-1")

    message = str(error.value)
    assert message.startswith("Auto model inventory failed for provider 9router:")
    assert "default model preflight failed:" in message
    assert "secret-value" not in message
    assert "upstream-secret-body" not in message
    assert probes == [("cc/claude-sonnet-4.5", "9router")]


def test_build_model_for_supported_providers_uses_db_keys(monkeypatch):
    for env_name in [
        "OPENAI_API_KEY",
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "GOOGLE_GENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "QWEN_API_KEY",
        "DASHSCOPE_API_KEY",
        "DEEPSEEK_API_KEY",
    ]:
        monkeypatch.delenv(env_name, raising=False)

    def read_provider_config(provider, user_id=None):
        return {"api_key": f"test-{provider}", "provider": provider}

    monkeypatch.setattr(runtime, "_read_provider_ai_config", read_provider_config)

    cases = [
        ("openai", "gpt-4o-mini", "ChatOpenAI"),
        ("google", "gemini-2.5-flash", "ChatGoogleGenerativeAI"),
        ("anthropic", "claude-3-5-haiku-latest", "ChatAnthropic"),
        ("qwen", "qwen-plus", "ChatOpenAI"),
        ("deepseek", "deepseek-chat", "ChatOpenAI"),
        ("9router", "cc/claude-sonnet-4.5", "ChatOpenAI"),
    ]

    for provider, model_id, class_name in cases:
        model = langchain_runtime.build_model(model_id=model_id, provider=provider, user_id="user-1")
        assert model.__class__.__name__ == class_name


def test_build_model_for_9router_uses_local_openai_compatible_base_url(monkeypatch):
    monkeypatch.delenv("_9ROUTER_BASE_URL", raising=False)
    monkeypatch.setattr(
        runtime,
        "_read_provider_ai_config",
        lambda provider, user_id=None: {"api_key": "test-9router", "provider": provider, "base_url": None},
    )

    model = langchain_runtime.build_model(model_id="cc/claude-opus-4-7", provider="9router")
    assert model.__class__.__name__ == "ChatOpenAI"
    assert str(model.openai_api_base) == "http://127.0.0.1:20128/v1"


def test_build_model_for_openai_uses_custom_resolved_base_url(monkeypatch):
    monkeypatch.setattr(
        runtime,
        "_read_provider_ai_config",
        lambda provider, user_id=None: {
            "api_key": "test-openai",
            "provider": "OpenAI",
            "base_url": "http://gateway-a.test/v1",
        },
    )

    model = langchain_runtime.build_model(
        model_id="gateway/available-model",
        provider="OpenAI",
        user_id="user-1",
    )

    assert model.__class__.__name__ == "ChatOpenAI"
    assert str(model.openai_api_base) == "http://gateway-a.test/v1"


def test_openai_auto_inventory_and_generation_share_override_or_native_default(monkeypatch):
    config = {
        "api_key": "test-openai",
        "provider": "OpenAI",
        "base_url": "http://gateway-a.test/v1",
    }
    observed = []
    monkeypatch.setattr(runtime, "_read_provider_ai_config", lambda provider, user_id=None: config)
    monkeypatch.setattr(
        runtime,
        "urlopen",
        lambda request, timeout: observed.append((request.full_url, timeout))
        or FakeHTTPResponse({"data": [{"id": "gateway/available-model"}]}),
    )

    models = langchain_runtime.list_available_models("OpenAI", "user-1")
    model = langchain_runtime.build_model(
        model_id=models[0],
        provider="OpenAI",
        user_id="user-1",
    )

    assert observed == [("http://gateway-a.test/v1/models", 5)]
    assert str(model.openai_api_base).rstrip("/") == observed[0][0].removesuffix("/models")

    config = {"api_key": "test-openai", "provider": "OpenAI", "base_url": None}
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    native_model = langchain_runtime.build_model(model_id="gpt-4o-mini", provider="OpenAI", user_id="user-1")
    assert native_model.openai_api_base is None


def test_resolve_base_url_prefers_db_override(monkeypatch):
    monkeypatch.setenv("_9ROUTER_BASE_URL", "http://127.0.0.1:9999/v1")
    monkeypatch.setattr(
        runtime,
        "_read_provider_ai_config",
        lambda provider, user_id=None: {"base_url": "http://192.168.1.5:20128/v1"},
    )

    assert resolve_base_url("9router") == "http://192.168.1.5:20128/v1"


def test_resolve_base_url_falls_back_to_env_then_default(monkeypatch):
    monkeypatch.setattr(runtime, "_read_provider_ai_config", lambda provider, user_id=None: {"base_url": None})

    monkeypatch.setenv("_9ROUTER_BASE_URL", "http://127.0.0.1:7777/v1")
    assert resolve_base_url("9router") == "http://127.0.0.1:7777/v1"

    monkeypatch.delenv("_9ROUTER_BASE_URL", raising=False)
    assert resolve_base_url("9router") == "http://127.0.0.1:20128/v1"


def test_build_model_for_9router_honors_db_base_url_override(monkeypatch):
    monkeypatch.delenv("_9ROUTER_BASE_URL", raising=False)
    monkeypatch.setattr(
        runtime,
        "_read_provider_ai_config",
        lambda provider, user_id=None: {"api_key": "test-9router", "provider": provider, "base_url": "http://127.0.0.1:9999/v1"},
    )

    model = langchain_runtime.build_model(model_id="cc/claude-opus-4-7", provider="9router")
    assert str(model.openai_api_base) == "http://127.0.0.1:9999/v1"


def test_get_ai_api_key_does_not_require_env(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    def read_provider_config(provider, user_id=None):
        assert provider == "openai"
        assert user_id == "user-1"
        return {"api_key": "db-openai-key", "provider": "OpenAI"}

    monkeypatch.setattr(runtime, "_read_provider_ai_config", read_provider_config)

    assert get_ai_api_key("user-1", "OpenAI") == "db-openai-key"


def test_status_reports_supported_provider_registry():
    status = langchain_runtime.status()

    assert status["supportedProviders"] == ["openai", "google", "anthropic", "qwen", "deepseek", "9router"]
    assert status["defaultModels"]["openai"] == "gpt-4o-mini"
    assert status["defaultModels"]["google"] == "gemini-2.5-flash"


def test_validate_model_ready_rejects_inactive_registered_model(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    monkeypatch.setattr(runtime, "SessionLocal", session_factory)
    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "test-key")

    session = session_factory()
    try:
        session.add(AIModel(
            id="model-1",
            name="Inactive Gemini",
            modelId="gemini-inactive",
            provider="Google",
            isActive=False,
        ))
        session.commit()
    finally:
        session.close()

    with pytest.raises(RuntimeError, match="inactive"):
        langchain_runtime.validate_model_ready(model_id="gemini-inactive", provider="google")


def test_validate_model_ready_remote_probe_surfaces_quota_errors(monkeypatch):
    class QuotaLimitedModel:
        def invoke(self, messages, config=None):
            raise RuntimeError("quota exceeded")

    monkeypatch.setattr(runtime, "get_ai_api_key", lambda user_id=None, provider=None: "test-key")
    monkeypatch.setattr(langchain_runtime, "build_model", lambda **kwargs: QuotaLimitedModel())

    with pytest.raises(RuntimeError, match="quota exceeded"):
        langchain_runtime.validate_model_ready(
            model_id="gemini-2.5-flash",
            provider="google",
            probe_remote=True,
        )


def test_langchain_failure_returns_provider_error_without_native_fallback(monkeypatch):
    service = BaseAIService()

    def fail_invoke(*args, **kwargs):
        raise RuntimeError("forced langchain failure")

    monkeypatch.setattr(langchain_runtime, "invoke_text", fail_invoke)

    openai_result = service._generate_response("Generate SQL", model_id="gpt-4o-mini")
    google_result = service._generate_response("Generate SQL", model_id="gemini-2.5-flash")

    assert openai_result.startswith("AI Error: LangChain generation failed for provider openai")
    assert google_result.startswith("AI Error: LangChain generation failed for provider google")


def test_user_ai_config_sqlite_migration_allows_one_key_per_provider():
    from sqlalchemy import create_engine

    from services.startup import migrate_user_ai_configs_for_provider_keys

    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            CREATE TABLE users (
                id VARCHAR NOT NULL,
                PRIMARY KEY (id)
            )
            """
        )
        connection.exec_driver_sql(
            """
            CREATE TABLE user_ai_configs (
                id VARCHAR NOT NULL,
                "userId" VARCHAR NOT NULL UNIQUE,
                "apiKey" VARCHAR NOT NULL,
                provider VARCHAR,
                created_on DATETIME,
                changed_on DATETIME,
                PRIMARY KEY (id),
                FOREIGN KEY("userId") REFERENCES users (id) ON DELETE CASCADE
            )
            """
        )
        connection.exec_driver_sql("INSERT INTO users (id) VALUES ('user-1')")
        connection.exec_driver_sql(
            """
            INSERT INTO user_ai_configs (id, "userId", "apiKey", provider)
            VALUES ('config-1', 'user-1', 'encrypted-google', 'Google')
            """
        )

    migrate_user_ai_configs_for_provider_keys(engine)

    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            INSERT INTO user_ai_configs (id, "userId", "apiKey", provider)
            VALUES ('config-2', 'user-1', 'encrypted-openai', 'OpenAI')
            """
        )
        rows = connection.exec_driver_sql(
            """
            SELECT "userId", provider FROM user_ai_configs
            ORDER BY provider
            """
        ).fetchall()

    assert rows == [("user-1", "Google"), ("user-1", "OpenAI")]


def test_user_ai_config_migration_adds_base_url_column():
    from sqlalchemy import create_engine

    from services.startup import migrate_user_ai_configs_for_provider_keys

    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE users (id VARCHAR NOT NULL, PRIMARY KEY (id))")
        connection.exec_driver_sql(
            """
            CREATE TABLE user_ai_configs (
                id VARCHAR NOT NULL,
                "userId" VARCHAR NOT NULL,
                "apiKey" VARCHAR NOT NULL,
                provider VARCHAR,
                created_on DATETIME,
                changed_on DATETIME,
                PRIMARY KEY (id),
                FOREIGN KEY("userId") REFERENCES users (id) ON DELETE CASCADE
            )
            """
        )
        connection.exec_driver_sql("INSERT INTO users (id) VALUES ('user-1')")
        connection.exec_driver_sql(
            """
            INSERT INTO user_ai_configs (id, "userId", "apiKey", provider)
            VALUES ('config-1', 'user-1', 'encrypted-9router', '9router')
            """
        )

    migrate_user_ai_configs_for_provider_keys(engine)

    with engine.begin() as connection:
        columns = [
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info('user_ai_configs')").fetchall()
        ]
        connection.exec_driver_sql(
            """
            UPDATE user_ai_configs SET "baseUrl" = 'http://127.0.0.1:20128/v1' WHERE id = 'config-1'
            """
        )
        base_url = connection.exec_driver_sql(
            'SELECT "baseUrl" FROM user_ai_configs WHERE id = ?', ("config-1",)
        ).fetchone()[0]

    assert "baseUrl" in columns
    assert base_url == "http://127.0.0.1:20128/v1"


def _make_reclaim_session():
    from sqlalchemy import create_engine

    from models import User, UserAIConfig

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add(User(id="real-admin", email="admin@quriodb.local", username="admin", password="x", roleId="default"))
    session.commit()
    return session, User, UserAIConfig


def test_reclaim_repoints_legacy_desktop_admin_configs():
    from services.startup import reclaim_desktop_admin_owned_rows

    session, User, UserAIConfig = _make_reclaim_session()
    session.add(UserAIConfig(id="c1", userId="desktop-admin-id", apiKey="enc", provider="9router"))
    session.commit()

    reclaim_desktop_admin_owned_rows(session, User)
    session.commit()

    config = session.query(UserAIConfig).filter(UserAIConfig.id == "c1").first()
    assert config.userId == "real-admin"


def test_reclaim_drops_legacy_duplicate_when_admin_already_configured_provider():
    from services.startup import reclaim_desktop_admin_owned_rows

    session, User, UserAIConfig = _make_reclaim_session()
    session.add(UserAIConfig(id="real", userId="real-admin", apiKey="enc-real", provider="9router"))
    session.add(UserAIConfig(id="legacy", userId="desktop-admin-id", apiKey="enc-old", provider="9router"))
    session.commit()

    reclaim_desktop_admin_owned_rows(session, User)
    session.commit()

    remaining = session.query(UserAIConfig).filter(UserAIConfig.provider == "9router").all()
    assert [c.id for c in remaining] == ["real"]
    assert session.query(UserAIConfig).filter(UserAIConfig.userId == "desktop-admin-id").count() == 0
