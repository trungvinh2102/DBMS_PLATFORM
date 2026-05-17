"""
test_stream_parser.py

Regression tests for semantic AI stream event parsing.
"""

from services.ai.stream_parser import TaggedResponseStreamParser


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


def test_parser_keeps_plain_message_text():
    events = collect_events(["Hello ", "world"])

    assert "".join(chunk for event, chunk in events if event == "message") == "Hello world"
