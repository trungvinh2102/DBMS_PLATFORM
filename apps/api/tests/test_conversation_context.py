"""
test_conversation_context.py

Unit tests for the ConversationContextManager.
Tests hierarchical memory, summarization fallback, Gemini format,
and edge cases like empty history or missing conversation.
"""

import pytest
from unittest.mock import MagicMock, patch
from services.conversation_context import (
    ConversationContextManager,
    MAX_RECENT_MESSAGES,
    SUMMARY_TRIGGER,
    MSG_TRUNCATE_LEN,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def ctx_mgr():
    """Context manager without LLM model (uses naive summarization)."""
    return ConversationContextManager(ai_model=None)


@pytest.fixture
def ctx_mgr_with_model():
    """Context manager with a mock LLM model."""
    mock_model = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "User was querying orders table and asked about joins."
    mock_model.generate_content.return_value = mock_response
    return ConversationContextManager(ai_model=mock_model)


def _make_history(count: int):
    """Generate a list of alternating user/assistant messages."""
    messages = []
    for i in range(count):
        role = "user" if i % 2 == 0 else "assistant"
        content = f"Message {i}: {'question' if role == 'user' else 'answer'} about SQL"
        messages.append({"role": role, "content": content})
    return messages


# ─── Tests: build_context ──────────────────────────────────────────────────────

class TestBuildContext:
    """Tests for build_context() — Gemini multi-turn format."""

    def test_no_conversation_id_returns_single_message(self, ctx_mgr):
        """When no conv_id, return only the current prompt."""
        result = ctx_mgr.build_context(None, "Show me users")
        assert len(result) == 1
        assert result[0]["role"] == "user"
        assert result[0]["parts"][0]["text"] == "Show me users"

    @patch.object(ConversationContextManager, '_load_history', return_value=[])
    def test_empty_history_returns_single_message(self, mock_load, ctx_mgr):
        """When conv_id exists but no history in DB, return only current prompt."""
        result = ctx_mgr.build_context("conv-123", "Show me users")
        assert len(result) == 1
        assert result[0]["parts"][0]["text"] == "Show me users"

    @patch.object(ConversationContextManager, '_load_history')
    def test_short_history_passes_all_raw(self, mock_load, ctx_mgr):
        """When history is small (<= SUMMARY_TRIGGER), pass all messages raw."""
        history = _make_history(4)  # 4 messages — below threshold
        mock_load.return_value = history

        result = ctx_mgr.build_context("conv-123", "Next question")
        
        # 4 historical + 1 current = 5 messages
        assert len(result) == 5
        # Last message should be the current prompt
        assert result[-1]["role"] == "user"
        assert result[-1]["parts"][0]["text"] == "Next question"
        # First message should be from history
        assert "Message 0" in result[0]["parts"][0]["text"]

    @patch.object(ConversationContextManager, '_load_history')
    def test_long_history_triggers_summarization(self, mock_load, ctx_mgr):
        """When history > SUMMARY_TRIGGER, summary + recent are created."""
        history = _make_history(12)  # 12 messages — above threshold (8)
        mock_load.return_value = history

        result = ctx_mgr.build_context("conv-123", "Next question")
        
        # Should have: summary pair (2) + recent (MAX_RECENT_MESSAGES) + current (1)
        # Summary pair = synthetic user msg + synthetic model ack
        assert len(result) > MAX_RECENT_MESSAGES
        # First message should be the summary injection
        assert "[Previous conversation summary]" in result[0]["parts"][0]["text"]
        # Second should be model acknowledgment
        assert result[1]["role"] == "model"
        # Last should be current prompt
        assert result[-1]["parts"][0]["text"] == "Next question"

    @patch.object(ConversationContextManager, '_load_history')
    def test_gemini_role_mapping(self, mock_load, ctx_mgr):
        """Assistant role should map to 'model' for Gemini API."""
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"},
        ]
        mock_load.return_value = history

        result = ctx_mgr.build_context("conv-123", "Follow up")
        
        assert result[0]["role"] == "user"
        assert result[1]["role"] == "model"  # assistant → model
        assert result[2]["role"] == "user"   # current prompt

    @patch.object(ConversationContextManager, '_load_history')
    def test_consecutive_same_role_merged(self, mock_load, ctx_mgr):
        """Consecutive messages with same role get merged (Gemini requires alternating)."""
        history = [
            {"role": "user", "content": "First question"},
            {"role": "user", "content": "Second question"},
            {"role": "assistant", "content": "Combined answer"},
        ]
        mock_load.return_value = history

        result = ctx_mgr.build_context("conv-123", "Third question")
        
        # Two consecutive user messages should be merged into one
        assert result[0]["role"] == "user"
        assert "First question" in result[0]["parts"][0]["text"]
        assert "Second question" in result[0]["parts"][0]["text"]
        assert result[1]["role"] == "model"


# ─── Tests: build_context_for_agent ────────────────────────────────────────────

class TestBuildContextForAgent:
    """Tests for build_context_for_agent() — text block format."""

    def test_no_conversation_id_returns_empty(self, ctx_mgr):
        result = ctx_mgr.build_context_for_agent(None, "Show me users")
        assert result == ""

    @patch.object(ConversationContextManager, '_load_history', return_value=[])
    def test_empty_history_returns_empty(self, mock_load, ctx_mgr):
        result = ctx_mgr.build_context_for_agent("conv-123", "Show me users")
        assert result == ""

    @patch.object(ConversationContextManager, '_load_history')
    def test_short_history_formats_all(self, mock_load, ctx_mgr):
        history = _make_history(4)
        mock_load.return_value = history

        result = ctx_mgr.build_context_for_agent("conv-123", "Next")
        
        assert "[Conversation History]:" in result
        assert "USER:" in result
        assert "ASSISTANT:" in result

    @patch.object(ConversationContextManager, '_load_history')
    def test_long_history_includes_summary_and_recent(self, mock_load, ctx_mgr):
        history = _make_history(12)
        mock_load.return_value = history

        result = ctx_mgr.build_context_for_agent("conv-123", "Next")
        
        # Should have a summary section from naive fallback
        assert "User previously asked:" in result or "[Conversation Summary]:" in result
        # Should have recent messages section
        assert "[Recent Messages]:" in result

    @patch.object(ConversationContextManager, '_load_history')
    def test_message_truncation(self, mock_load, ctx_mgr):
        """Long messages should be truncated in the context."""
        long_content = "x" * 1000
        history = [{"role": "user", "content": long_content}]
        mock_load.return_value = history

        result = ctx_mgr.build_context_for_agent("conv-123", "Next")
        
        # Content should be truncated to MSG_TRUNCATE_LEN
        # The result string should not contain the full 1000 chars
        assert len(result) < 1000


# ─── Tests: Summarization ─────────────────────────────────────────────────────

class TestSummarization:
    """Tests for _summarize_history()."""

    def test_naive_summary_fallback(self, ctx_mgr):
        """Without LLM, produces a naive summary from user messages."""
        messages = [
            {"role": "user", "content": "Show orders"},
            {"role": "assistant", "content": "SELECT * FROM orders"},
            {"role": "user", "content": "Filter by date"},
            {"role": "assistant", "content": "SELECT * FROM orders WHERE date > ..."},
        ]
        result = ctx_mgr._summarize_history(messages)
        
        assert "User previously asked:" in result
        assert "Show orders" in result
        assert "Filter by date" in result

    def test_empty_messages_returns_empty(self, ctx_mgr):
        result = ctx_mgr._summarize_history([])
        assert result == ""

    def test_llm_summary_used_when_available(self, ctx_mgr_with_model):
        """When LLM model is available, it should be used for summarization."""
        messages = _make_history(6)
        result = ctx_mgr_with_model._summarize_history(messages)
        
        assert "orders table" in result  # From mock response

    def test_llm_failure_falls_back_to_naive(self, ctx_mgr_with_model):
        """When LLM call fails, falls back to naive summary."""
        ctx_mgr_with_model._ai_model.generate_content.side_effect = Exception("API Error")
        
        messages = _make_history(6)
        result = ctx_mgr_with_model._summarize_history(messages)
        
        # Should still produce a result (fallback)
        assert "User previously asked:" in result


# ─── Tests: Helper Methods ─────────────────────────────────────────────────────

class TestHelpers:
    def test_truncate_short_text(self):
        result = ConversationContextManager._truncate("hello", 100)
        assert result == "hello"

    def test_truncate_long_text(self):
        result = ConversationContextManager._truncate("x" * 200, 50)
        assert len(result) == 53  # 50 + "..."
        assert result.endswith("...")

    def test_truncate_empty(self):
        result = ConversationContextManager._truncate("", 50)
        assert result == ""

    def test_truncate_none(self):
        result = ConversationContextManager._truncate(None, 50)
        assert result == ""
