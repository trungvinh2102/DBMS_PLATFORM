"""Route tests for streaming SQL Explain and Optimize actions."""

import json

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from models import AIChatMessage, AIConversation, Base
from utils.auth_middleware import get_current_user


def _parse_sse_events(body: str):
    events = []
    for block in body.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        events.append((lines["event"], json.loads(lines["data"])))
    return events


def test_explain_sql_stream_emits_events_and_persists_same_conversation(app, mocker):
    saved = []
    snapshots = []

    mocker.patch("routes.ai_stream.conversation_store.ensure_conversation", return_value="conv-explain")
    mocker.patch("routes.ai_stream.conversation_store.load_recent_history", return_value=[])
    mocker.patch("routes.ai_stream.ai_service._save_chat", side_effect=lambda *args, **kwargs: saved.append((args, kwargs)))
    mocker.patch(
        "routes.ai_stream._persist_stream_snapshot",
        side_effect=lambda parts, message_id, user_id, database_id, conversation_id: snapshots.append(
            (parts, message_id, user_id, database_id, conversation_id)
        ) or "assistant-explain",
    )

    def fake_stream(prompt, **kwargs):
        assert prompt == "Explain this SQL: SELECT 1;"
        assert kwargs["task_key"] == "sql.explain"
        yield "thinking", "Thinking"
        yield "message", "First"
        yield "message", " second"
        yield "done", "complete"

    mocker.patch("routes.ai_stream.ai_service.stream_generate_response", side_effect=fake_stream)

    response = TestClient(app).post(
        "/api/ai/explain-sql/stream",
        json={"sql": "SELECT 1;", "conversationId": "conv-explain", "modelId": "model-1"},
    )

    events = _parse_sse_events(response.text)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert [event[0] for event in events] == ["thinking", "message", "message", "done"]
    assert response.headers["X-Conversation-Id"] == "conv-explain"
    assert saved[0] == (("user", "Explain this SQL: SELECT 1;", "test-user-id", None), {"conv_id": "conv-explain"})
    assert all(snapshot[4] == "conv-explain" for snapshot in snapshots)


def test_optimize_sql_stream_passes_context_and_persists_same_conversation(app, mocker):
    saved = []
    snapshots = []
    captured = {}

    mocker.patch("routes.ai_stream.conversation_store.ensure_conversation", return_value="conv-optimize")
    mocker.patch("routes.ai_stream.conversation_store.load_recent_history", return_value=[])
    mocker.patch("routes.ai_stream.ai_service._save_chat", side_effect=lambda *args, **kwargs: saved.append((args, kwargs)))
    mocker.patch(
        "routes.ai_stream._persist_stream_snapshot",
        side_effect=lambda parts, message_id, user_id, database_id, conversation_id: snapshots.append(
            (parts, message_id, user_id, database_id, conversation_id)
        ) or "assistant-optimize",
    )

    def fake_stream(prompt, **kwargs):
        captured["prompt"] = prompt
        captured["kwargs"] = kwargs
        yield "thinking", "Thinking"
        yield "message", "Optimized"
        yield "message", " SQL"
        yield "done", "complete"

    mocker.patch("routes.ai_stream.ai_service.stream_generate_response", side_effect=fake_stream)

    response = TestClient(app).post(
        "/api/ai/optimize-sql/stream",
        json={
            "sql": "SELECT * FROM users;",
            "conversationId": "conv-optimize",
            "databaseId": "db-1",
            "schema_name": "analytics",
            "modelId": "model-2",
        },
    )

    events = _parse_sse_events(response.text)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert [event[0] for event in events] == ["thinking", "message", "message", "done"]
    assert captured["prompt"] == "Optimize this SQL: SELECT * FROM users;"
    assert captured["kwargs"] == {
        "db_id": "db-1",
        "schema": "analytics",
        "model_id": "model-2",
        "task_key": "sql.optimize",
        "user_id": "test-user-id",
        "history": [],
        "conv_id": "conv-optimize",
    }
    assert saved[0] == (("user", "Optimize this SQL: SELECT * FROM users;", "test-user-id", "db-1"), {"conv_id": "conv-optimize"})
    assert all(snapshot[3:] == ("db-1", "conv-optimize") for snapshot in snapshots)


def test_optimize_sql_stream_requires_database_before_service(app, mocker):
    stream = mocker.patch("routes.ai_stream.ai_service.stream_generate_response")

    response = TestClient(app).post(
        "/api/ai/optimize-sql/stream",
        json={"sql": "SELECT 1;", "conversationId": "conv-1"},
    )

    assert response.status_code == 422
    stream.assert_not_called()


def test_action_stream_generator_error_emits_error_and_persists_visible_message(app, mocker):
    saved = []
    snapshots = []
    mocker.patch("routes.ai_stream.conversation_store.ensure_conversation", return_value="conv-error")
    mocker.patch("routes.ai_stream.conversation_store.load_recent_history", return_value=[])
    mocker.patch("routes.ai_stream.ai_service._save_chat", side_effect=lambda *args, **kwargs: saved.append((args, kwargs)))
    mocker.patch(
        "routes.ai_stream._persist_stream_snapshot",
        side_effect=lambda parts, message_id, user_id, database_id, conversation_id: snapshots.append(
            (parts, message_id, user_id, database_id, conversation_id)
        ) or "assistant-error",
    )

    def failing_stream(prompt, **kwargs):
        yield "thinking", "Thinking"
        raise RuntimeError("provider unavailable")

    mocker.patch("routes.ai_stream.ai_service.stream_generate_response", side_effect=failing_stream)

    response = TestClient(app).post(
        "/api/ai/explain-sql/stream",
        json={"sql": "SELECT 1;", "conversationId": "conv-error"},
    )

    events = _parse_sse_events(response.text)
    assert response.status_code == 200
    assert events[-1] == ("error", "Error: provider unavailable")
    assert saved[0] == (("user", "Explain this SQL: SELECT 1;", "test-user-id", None), {"conv_id": "conv-error"})
    assert snapshots[-1][4] == "conv-error"
    assert "Error: provider unavailable" in snapshots[-1][0]["message"][-1]


def test_action_stream_requires_authentication(app, monkeypatch):
    monkeypatch.setattr("utils.auth_middleware.DISABLE_AUTH", False)
    app.dependency_overrides.pop(get_current_user)

    response = TestClient(app).post(
        "/api/ai/explain-sql/stream",
        json={"sql": "SELECT 1;"},
    )

    assert response.status_code == 401


def test_action_stream_rejects_foreign_conversation_before_streaming(app, mocker, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    session.add(AIConversation(
        id="foreign-conversation",
        title="Foreign",
        userId="another-user-id",
        databaseId="db-1",
    ))
    session.commit()
    session.close()

    monkeypatch.setattr("services.ai.conversation_store.SessionLocal", session_factory)
    stream = mocker.patch("routes.ai_stream.ai_service.stream_generate_response")
    save_chat = mocker.patch("routes.ai_stream.ai_service._save_chat")

    response = TestClient(app).post(
        "/api/ai/optimize-sql/stream",
        json={
            "sql": "SELECT 1;",
            "conversationId": "foreign-conversation",
            "databaseId": "db-1",
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Conversation not found"}
    stream.assert_not_called()
    save_chat.assert_not_called()


def test_explain_without_database_rejects_database_scoped_conversation(app, mocker, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    session.add(AIConversation(
        id="database-scoped-conversation",
        title="Database scoped",
        userId="test-user-id",
        databaseId="db-1",
    ))
    session.commit()
    session.close()

    monkeypatch.setattr("services.ai.conversation_store.SessionLocal", session_factory)
    stream = mocker.patch("routes.ai_stream.ai_service.stream_generate_response")

    response = TestClient(app).post(
        "/api/ai/explain-sql/stream",
        json={"sql": "SELECT 1;", "conversationId": "database-scoped-conversation"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Conversation not found"}
    stream.assert_not_called()


def test_action_stream_persists_same_user_messages_under_exact_conversation_and_database(app, mocker, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    session.add(AIConversation(
        id="owned-conversation",
        title="Owned",
        userId="test-user-id",
        databaseId="db-1",
    ))
    session.commit()
    session.close()

    monkeypatch.setattr("services.ai.conversation_store.SessionLocal", session_factory)
    monkeypatch.setattr("routes.ai_stream.SessionLocal", session_factory)
    monkeypatch.setattr("services.ai.base.SessionLocal", session_factory)
    mocker.patch("routes.ai_stream.ai_service.stream_generate_response", return_value=iter([
        ("message", "Optimized SQL"),
        ("done", "complete"),
    ]))

    response = TestClient(app).post(
        "/api/ai/optimize-sql/stream",
        json={
            "sql": "SELECT 1;",
            "conversationId": "owned-conversation",
            "databaseId": "db-1",
        },
    )

    assert response.status_code == 200
    persisted = session_factory().query(AIChatMessage).filter_by(conversationId="owned-conversation").order_by(AIChatMessage.role).all()
    assert [(message.role, message.userId, message.databaseId) for message in persisted] == [
        ("assistant", "test-user-id", "db-1"),
        ("user", "test-user-id", "db-1"),
    ]
    assert all(message.conversationId == "owned-conversation" for message in persisted)
