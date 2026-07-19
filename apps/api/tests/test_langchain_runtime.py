"""
test_langchain_runtime.py

Regression tests for QurioDB's LangChain provider runtime, OpenAI-compatible
provider selection, and provider-safe AI service fallback behavior.
"""

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


def test_infer_provider_from_model_id():
    assert infer_provider_from_model_id("gpt-4o-mini") == "openai"
    assert infer_provider_from_model_id("gemini-2.5-flash") == "google"
    assert infer_provider_from_model_id("claude-3-5-haiku-latest") == "anthropic"
    assert infer_provider_from_model_id("qwen-plus") == "qwen"
    assert infer_provider_from_model_id("deepseek-chat") == "deepseek"


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
