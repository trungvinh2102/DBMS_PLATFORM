"""
test_ai_stream_model_readiness.py

Regression tests for model readiness checks before AI Assistant streaming work.
"""

from types import SimpleNamespace

from services.ai_service import MODEL_PREFLIGHT_STATUS
from services.ai_service import ai_service


def test_stream_checks_explicit_model_before_understanding(mocker):
    understand = mocker.patch("services.ai_service.query_understanding_service.understand")
    mocker.patch(
        "services.ai_service.langchain_runtime.resolve_provider",
        return_value="google",
    )
    validate_model_ready = mocker.patch(
        "services.ai_service.langchain_runtime.validate_model_ready",
        side_effect=RuntimeError("AI model 'gemini-inactive' is inactive"),
    )

    events = list(ai_service.stream_generate_response(
        "hello",
        db_id="db-1",
        user_id="user-1",
        model_id="gemini-inactive",
    ))

    assert events == [
        ("thinking", MODEL_PREFLIGHT_STATUS),
        ("error", "AI model 'gemini-inactive' is inactive"),
    ]
    validate_model_ready.assert_called_once_with(
        model_id="gemini-inactive",
        user_id="user-1",
        provider="google",
        probe_remote=True,
    )
    understand.assert_not_called()


def test_stream_checks_model_readiness_before_retrieval(mocker):
    mocker.patch(
        "services.ai_service.query_understanding_service.understand",
        return_value=SimpleNamespace(needs_retrieval=True),
    )
    mocker.patch(
        "services.ai_service.task_model_router.resolve_model_id",
        return_value="gemini-inactive",
    )
    mocker.patch(
        "services.ai_service.langchain_runtime.resolve_provider",
        return_value="google",
    )
    validate_model_ready = mocker.patch(
        "services.ai_service.langchain_runtime.validate_model_ready",
        side_effect=RuntimeError("AI model 'gemini-inactive' is inactive"),
    )
    build_context = mocker.patch("services.ai_service.rag_context_builder.build")

    events = list(ai_service.stream_generate_response(
        "show customer tables",
        db_id="db-1",
        user_id="user-1",
    ))

    assert events == [
        ("thinking", MODEL_PREFLIGHT_STATUS),
        ("error", "AI model 'gemini-inactive' is inactive"),
    ]
    validate_model_ready.assert_called_once_with(
        model_id="gemini-inactive",
        user_id="user-1",
        provider="google",
        probe_remote=True,
    )
    build_context.assert_not_called()
