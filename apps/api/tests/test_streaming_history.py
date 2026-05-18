"""
test_streaming_history.py

Regression tests for rebuilding streamed AI Assistant events into saved chat history.
"""

import datetime

from services.ai.streaming import (
    append_stream_part,
    build_assistant_history_content,
    clean_assistant_history_content,
    new_response_parts,
    parse_assistant_history_content,
)
from services.ai.conversation_store import AIConversationStore


def test_build_history_preserves_semantic_sections():
    parts = new_response_parts()

    append_stream_part(parts, "thinking", "Plan the answer")
    append_stream_part(parts, "confidence", "4")
    append_stream_part(parts, "message", "Here is the query.")
    append_stream_part(parts, "sql", "SELECT * FROM users;")
    append_stream_part(parts, "analysis", "Reads from users.")

    content = build_assistant_history_content(parts)
    payload = parse_assistant_history_content(content)

    assert "<thinking>" not in content
    assert "<confidence>" not in content
    assert "```sql" not in content
    assert payload["thinking"] == "Plan the answer"
    assert payload["confidence"] == 4
    assert payload["content"] == "Here is the query."
    assert payload["sql"] == "SELECT * FROM users;"
    assert payload["analysis"] == "Reads from users."
    assert [event["type"] for event in payload["events"]] == ["thinking", "confidence", "message", "sql", "analysis"]


def test_append_stream_part_preserves_status_thinking_events():
    parts = new_response_parts()

    append_stream_part(parts, "thinking", "Initializing context...")
    append_stream_part(parts, "thinking", "Actual reasoning")

    assert parts["thinking"] == ["Initializing context...", "Actual reasoning"]


def test_build_history_merges_split_thinking_words_within_same_labeled_step():
    parts = new_response_parts()

    append_stream_part(parts, "thinking", "Intent: Xác định những người")
    append_stream_part(parts, "thinking", " dùng đã sử dụng từ ngữ")
    append_stream_part(parts, "thinking", " nhạy cảm.")
    append_stream_part(parts, "thinking", "Schema mapping: Cột transcription")
    append_stream_part(parts, "thinking", " chứa nội dung cần kiểm tra.")

    payload = parse_assistant_history_content(build_assistant_history_content(parts))
    thinking_events = [event for event in payload["events"] if event["type"] == "thinking"]

    assert thinking_events == [
        {"type": "thinking", "content": "Intent: Xác định những người dùng đã sử dụng từ ngữ nhạy cảm."},
        {"type": "thinking", "content": "Schema mapping: Cột transcription chứa nội dung cần kiểm tra."},
    ]


def test_build_history_preserves_stream_order_and_unknown_events():
    parts = new_response_parts()

    append_stream_part(parts, "thinking", "Initializing context...")
    append_stream_part(parts, "message", "Ready.")
    append_stream_part(parts, "debug_trace", "trace payload")
    append_stream_part(parts, "thinking", "Actual reasoning")

    content = build_assistant_history_content(parts)
    payload = parse_assistant_history_content(content)

    assert [event["type"] for event in payload["events"]] == ["thinking", "message", "debug_trace", "thinking"]
    assert payload["events"][0]["content"] == "Initializing context..."
    assert payload["events"][1]["content"] == "Ready."
    assert payload["events"][2]["content"] == "trace payload"
    assert payload["events"][3]["content"] == "Actual reasoning"


def test_clean_history_removes_internal_tool_call_blocks():
    content = clean_assistant_history_content(
        '<tool_call>{"name": "SchemaContextLoader", "args": {}}</tool_call>\n\n'
        "Hello!\n\n"
        '<tool_call>{"name": "RetrievalTrace", "args": {}}</tool_call>'
    )

    assert "<tool_call>" not in content
    assert "SchemaContextLoader" not in content
    assert content == "Hello!"


def test_parse_legacy_history_returns_structured_fields_without_tags():
    payload = parse_assistant_history_content(
        "<thinking>\nPlan\n</thinking>\n\n"
        "<confidence>5</confidence>\n\n"
        "Here you go.\n\n"
        "```sql\nSELECT 1;\n```\n\n"
        "### ANALYSIS:\nReads a constant."
    )

    assert payload["content"] == "Here you go."
    assert payload["thinking"] == "Plan"
    assert payload["confidence"] == 5
    assert payload["sql"] == "SELECT 1;"
    assert payload["analysis"] == "Reads a constant."


def test_conversation_message_dict_returns_structured_assistant_fields():
    class Message:
        id = "msg-1"
        role = "assistant"
        content = (
            "<thinking>\nPlan\n</thinking>\n\n"
            "<confidence>5</confidence>\n\n"
            "Here you go.\n\n"
            "```sql\nSELECT 1;\n```\n\n"
            "### ANALYSIS:\nReads a constant."
        )
        created_on = datetime.datetime(2026, 5, 18, 0, 0, 0)
        databaseId = "db-1"

    result = AIConversationStore()._message_to_dict(Message())

    assert result["content"] == "Here you go."
    assert result["thought"] == "Plan"
    assert result["sql"] == "SELECT 1;"
    assert result["analysis"] == "Reads a constant."
    assert result["confidence"] == 5
    assert result["created_on"] == "2026-05-18T00:00:00Z"
    assert [event["type"] for event in result["events"]] == ["message", "thinking", "confidence", "sql", "analysis"]


def test_conversation_timestamp_serializes_as_utc_iso_string():
    store = AIConversationStore()
    timestamp = datetime.datetime(2026, 5, 18, 15, 49, 40)

    assert store._isoformat_utc(timestamp) == "2026-05-18T15:49:40Z"
