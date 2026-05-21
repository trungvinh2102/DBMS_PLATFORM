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
from services.ai.langchain_runtime import get_ai_api_key, infer_provider_from_model_id, langchain_runtime
from services.ai.base import BaseAIService


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
    ]

    for provider, model_id, class_name in cases:
        model = langchain_runtime.build_model(model_id=model_id, provider=provider, user_id="user-1")
        assert model.__class__.__name__ == class_name


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

    assert status["supportedProviders"] == ["openai", "google", "anthropic", "qwen", "deepseek"]
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
