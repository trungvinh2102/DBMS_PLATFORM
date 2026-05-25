"""
test_stream_parser.py

Regression tests for semantic AI stream event parsing.
"""

import pytest

from services.ai.stream_parser import TaggedResponseStreamParser

pytestmark = pytest.mark.rag


def collect_events(chunks):
    parser = TaggedResponseStreamParser()
    events = []
    for chunk in chunks:
        events.extend(parser.feed(chunk))
    events.extend(parser.flush())
    return events


def test_parser_splits_model_thinking_sql_and_analysis():
    events = collect_events([
        "<thinking>\nPlan the query",
        "\n</thinking>\n\n<confidence>4</confidence>\n\n```sql\nSELECT *",
        " FROM users;\n```\n\n### ANALYSIS:\nUses the users table.",
    ])

    by_event = {}
    for event, chunk in events:
        by_event[event] = by_event.get(event, "") + chunk

    assert by_event["thinking"] == "\nPlan the query\n"
    assert by_event["confidence"] == "4"
    assert by_event["sql"] == "SELECT * FROM users;\n"
    assert by_event["analysis"] == "Uses the users table."


def test_parser_splits_legacy_labeled_sql_and_analysis():
    events = collect_events([
        "SQL: SELECT u.id, COUNT(*) AS bookings",
        "\nFROM users u\nJOIN bookings b ON b.user_id = u.id",
        "\nAnalysis: Counts bookings per user.",
    ])

    by_event = {}
    for event, chunk in events:
        by_event[event] = by_event.get(event, "") + chunk

    assert by_event["sql"].strip() == "SELECT u.id, COUNT(*) AS bookings\nFROM users u\nJOIN bookings b ON b.user_id = u.id"
    assert by_event["analysis"].strip() == "Counts bookings per user."


def test_parser_splits_analysis_and_suggestions():
    events = collect_events([
        "Here are the insights.\n\n### ANALYSIS:\nSample-level only.",
        "\n\n### SUGGESTIONS:\n[{\"label\":\"Lọc tháng này\",\"prompt\":\"Lọc kết quả theo tháng này\",\"intent\":\"filter\"}]",
    ])

    by_event = {}
    for event, chunk in events:
        by_event[event] = by_event.get(event, "") + chunk

    assert by_event["analysis"].strip() == "Sample-level only."
    assert '"label":"Lọc tháng này"' in by_event["suggestions"]


def test_parser_preserves_separate_thinking_events():
    events = collect_events([
        "<thinking>Intent: count users.</thinking>",
        "<thinking>Schema mapping: use public.users.</thinking>",
        "<thinking>Strategy: group by status.</thinking>",
    ])

    assert events == [
        ("thinking", "count users."),
        ("thinking", "use public.users."),
        ("thinking", "group by status."),
    ]


def test_parser_keeps_plain_message_text():
    events = collect_events(["Hello ", "world"])

    assert "".join(chunk for event, chunk in events if event == "message") == "Hello world"


def test_parser_discards_internal_tool_json_envelopes():
    events = collect_events([
        '{"name": "SchemaContextLoader", "args": {"databaseId": "db-1", "intent": "Xin chào"}}',
        '{"name": "RetrievalTrace", "args": {"intent": "Xin chào", "tables": []}}',
        "Xin chào! Tôi là QurioDB copilot.",
    ])

    assert "".join(chunk for event, chunk in events if event == "message") == "Xin chào! Tôi là QurioDB copilot."


def test_parser_discards_internal_tool_json_split_across_chunks():
    events = collect_events([
        '{"name": "Schema',
        'ContextLoader", "args": {"databaseId": "db-1", "intent": "Xin chào"}}',
        "\nXin chào!",
    ])

    assert events == [("message", "Xin chào!")]


def test_parser_discards_internal_tool_call_tags():
    events = collect_events([
        '<tool_call>{"name": "SchemaContextLoader", "args": {"databaseId": "db-1"}}</tool_call>',
        "\n\n",
        '<tool_call>{"name": "RetrievalTrace", "args": {"tables": []}}</tool_call>',
        "\nHello!",
    ])

    assert events == [("message", "Hello!")]


def test_parser_discards_internal_tool_call_tags_split_at_tag_prefix():
    events = collect_events([
        "<tool",
        '_call>{"name": "SchemaContextLoader", "args": {"databaseId": "db-1"}}</tool_call>',
        "\nHello!",
    ])

    assert events == [("message", "Hello!")]
