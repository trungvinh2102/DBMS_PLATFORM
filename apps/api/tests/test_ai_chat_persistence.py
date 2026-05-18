"""
test_ai_chat_persistence.py

Regression tests for AI chat message persistence.
"""

from services.ai.base import BaseAIService


def test_save_chat_keeps_full_content(mocker):
    session = mocker.MagicMock()
    mocker.patch("services.ai.base.SessionLocal", return_value=session)
    captured_messages = []
    session.add.side_effect = captured_messages.append
    long_content = "x" * 6000

    message_id = BaseAIService()._save_chat("assistant", long_content, "user-1", "db-1", "conv-1")

    assert message_id
    assert captured_messages[0].content == long_content
