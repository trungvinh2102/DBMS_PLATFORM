"""
test_ai_stream_display.py

Regression tests for user-visible AI stream message text.
"""

from routes.ai_stream import _resolve_display_message, _resolve_stream_messages
from schemas.ai import StreamChatRequest


def test_stream_request_uses_display_text_for_saved_user_message():
    request = StreamChatRequest(
        text="Internal prompt with SQL, columns, and sample rows",
        displayText="Phân tích kết quả query hiện tại trong SQL Lab",
        messages=[{"role": "user", "content": "Internal prompt with SQL, columns, and sample rows"}],
        databaseId="db-1",
    )

    messages = _resolve_stream_messages(request)

    assert messages[-1]["content"] == "Internal prompt with SQL, columns, and sample rows"
    assert _resolve_display_message(request, messages[-1]["content"]) == "Phân tích kết quả query hiện tại trong SQL Lab"


def test_stream_request_falls_back_to_internal_prompt_without_display_text():
    request = StreamChatRequest(
        text="Show active users",
        messages=[{"role": "user", "content": "Show active users"}],
        databaseId="db-1",
    )

    messages = _resolve_stream_messages(request)

    assert _resolve_display_message(request, messages[-1]["content"]) == "Show active users"
