"""
embedding_gateway.py

Gemini embedding adapter for schema retrieval with graceful offline fallback.
"""

import logging
from typing import List, Optional

from ..base import _get_system_api_key

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

logger = logging.getLogger(__name__)


class GeminiEmbeddingGateway:
    """Wraps Gemini embedding calls behind a small, mockable interface."""

    def __init__(self, model: str = "models/gemini-embedding-2-preview"):
        self.model = model
        self._api_configured = False

    def is_available(self) -> bool:
        """Returns whether embeddings can be used for this process."""
        return bool(HAS_GENAI and genai and self._ensure_configured())

    def embed_document(self, content: str) -> List[float]:
        """Embeds schema index text for retrieval."""
        return self._embed(content, task_type="RETRIEVAL_DOCUMENT")

    def embed_query(self, content: str) -> List[float]:
        """Embeds user intent text for retrieval."""
        return self._embed(content, task_type="RETRIEVAL_QUERY")

    def _ensure_configured(self) -> bool:
        if self._api_configured:
            return True

        api_key = _get_system_api_key()
        if not api_key or not HAS_GENAI or not genai:
            return False

        try:
            genai.configure(api_key=api_key)
            self._api_configured = True
        except Exception as exc:
            logger.error("Failed to configure GenAI for embeddings: %s", exc)
        return self._api_configured

    def _embed(self, content: str, task_type: str) -> List[float]:
        if not self.is_available():
            return []

        response = genai.embed_content(
            model=self.model,
            content=content,
            task_type=task_type,
        )
        return response.get("embedding", [])
