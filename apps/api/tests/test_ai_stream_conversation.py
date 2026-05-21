"""
test_ai_stream_conversation.py

Regression tests for AI Assistant streaming conversation continuity.
"""

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.rag


def test_stream_exposes_conversation_id_header_and_uses_request_history(app, mocker):
    captured = {}

    mocker.patch("routes.ai_stream.conversation_store.ensure_conversation", return_value="conv-1")
    mocker.patch("routes.ai_stream.conversation_store.load_recent_history", return_value=[])
    mocker.patch("routes.ai_stream.ai_service._save_chat")
    persist_snapshot = mocker.patch("routes.ai_stream._persist_stream_snapshot", return_value="assistant-1")

    def stream_generate_response(prompt, **kwargs):
        captured["prompt"] = prompt
        captured["history"] = kwargs["history"]
        yield "message", "Done"

    mocker.patch("routes.ai_stream.ai_service.stream_generate_response", side_effect=stream_generate_response)

    client = TestClient(app)
    response = client.post(
        "/api/ai/stream",
        headers={"Origin": "http://localhost:3001"},
        json={
            "databaseId": "db-1",
            "messages": [
                {"role": "user", "content": "Create a users query"},
                {"role": "assistant", "content": "```sql\nSELECT * FROM users;\n```"},
                {"role": "user", "content": "Add a created_at filter"},
            ],
        },
    )

    assert response.status_code == 200
    assert response.headers["X-Conversation-Id"] == "conv-1"
    assert "x-conversation-id" in response.headers["access-control-expose-headers"].lower()
    assert captured["prompt"] == "Add a created_at filter"
    assert captured["history"] == [
        {"role": "user", "content": "Create a users query"},
        {"role": "assistant", "content": "```sql\nSELECT * FROM users;\n```"},
    ]
    assert persist_snapshot.called
