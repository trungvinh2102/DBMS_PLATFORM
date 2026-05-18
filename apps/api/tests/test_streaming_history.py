"""
test_streaming_history.py

Regression tests for rebuilding streamed AI Assistant events into saved chat history.
"""

from services.ai.streaming import (
    append_stream_part,
    build_assistant_history_content,
    new_response_parts,
)


def test_build_history_preserves_semantic_sections():
    parts = new_response_parts()

    append_stream_part(parts, "thinking", "Plan the answer")
    append_stream_part(parts, "confidence", "4")
    append_stream_part(parts, "message", "Here is the query.")
    append_stream_part(parts, "sql", "SELECT * FROM users;")
    append_stream_part(parts, "analysis", "Reads from users.")

    content = build_assistant_history_content(parts)

    assert "<thinking>" in content
    assert "<confidence>4</confidence>" in content
    assert "Here is the query." in content
    assert "```sql\nSELECT * FROM users;\n```" in content
    assert "### ANALYSIS:\nReads from users." in content


def test_append_stream_part_preserves_status_thinking_events():
    parts = new_response_parts()

    append_stream_part(parts, "thinking", "Initializing context...")
    append_stream_part(parts, "thinking", "Actual reasoning")

    assert parts["thinking"] == ["Initializing context...", "Actual reasoning"]


def test_build_history_preserves_stream_order_and_unknown_events():
    parts = new_response_parts()

    append_stream_part(parts, "thinking", "Initializing context...")
    append_stream_part(parts, "message", "Ready.")
    append_stream_part(parts, "debug_trace", "trace payload")
    append_stream_part(parts, "thinking", "Actual reasoning")

    content = build_assistant_history_content(parts)

    assert content.index("Initializing context...") < content.index("Ready.")
    assert '<stream_event name="debug_trace">trace payload</stream_event>' in content
    assert content.index("trace payload") < content.index("Actual reasoning")
