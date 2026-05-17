"""
test_langchain_runtime.py

Regression tests for QurioDB's LangChain provider runtime and OpenAI-compatible
provider selection.
"""

from services.ai.langchain_runtime import infer_provider_from_model_id, langchain_runtime


def test_infer_provider_from_model_id():
    assert infer_provider_from_model_id("gpt-4o-mini") == "openai"
    assert infer_provider_from_model_id("gemini-2.5-flash") == "google"
    assert infer_provider_from_model_id("claude-3-5-haiku-latest") == "anthropic"
    assert infer_provider_from_model_id("qwen-plus") == "qwen"
    assert infer_provider_from_model_id("deepseek-chat") == "deepseek"


def test_build_model_for_supported_providers(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-anthropic")
    monkeypatch.setenv("QWEN_API_KEY", "test-qwen")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-deepseek")

    cases = [
        ("openai", "gpt-4o-mini", "ChatOpenAI"),
        ("google", "gemini-2.5-flash", "ChatGoogleGenerativeAI"),
        ("anthropic", "claude-3-5-haiku-latest", "ChatAnthropic"),
        ("qwen", "qwen-plus", "ChatOpenAI"),
        ("deepseek", "deepseek-chat", "ChatOpenAI"),
    ]

    for provider, model_id, class_name in cases:
        model = langchain_runtime.build_model(model_id=model_id, provider=provider)
        assert model.__class__.__name__ == class_name
