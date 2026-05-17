"""
embedding_gateway.py

LangChain Google embedding adapter for schema retrieval with graceful offline fallback.
"""

import logging
from typing import List, Optional

from ..base import _get_system_api_key

try:
    from langchain_google_genai import GoogleGenerativeAIEmbeddings

    HAS_GOOGLE_EMBEDDINGS = True
except ImportError:
    GoogleGenerativeAIEmbeddings = None
    HAS_GOOGLE_EMBEDDINGS = False

logger = logging.getLogger(__name__)


class GeminiEmbeddingGateway:
    """Wraps Gemini embedding calls behind a small, mockable interface."""

    def __init__(self, model: str = "models/gemini-embedding-2-preview"):
        self.model = model
        self._api_key: Optional[str] = None

    def is_available(self) -> bool:
        """Returns whether embeddings can be used for this process."""
        return bool(HAS_GOOGLE_EMBEDDINGS and GoogleGenerativeAIEmbeddings and self._get_api_key())

    def embed_document(self, content: str) -> List[float]:
        """Embeds schema index text for retrieval."""
        return self._embed(content, task_type="RETRIEVAL_DOCUMENT")

    def embed_query(self, content: str) -> List[float]:
        """Embeds user intent text for retrieval."""
        return self._embed(content, task_type="RETRIEVAL_QUERY")

    def _get_api_key(self) -> Optional[str]:
        if not self._api_key:
            self._api_key = _get_system_api_key()
        return self._api_key

    def _build_embeddings(self, task_type: str):
        api_key = self._get_api_key()
        if not api_key or not HAS_GOOGLE_EMBEDDINGS or not GoogleGenerativeAIEmbeddings:
            return None

        return GoogleGenerativeAIEmbeddings(
            model=self.model,
            api_key=api_key,
            task_type=task_type,
        )

    def _embed(self, content: str, task_type: str) -> List[float]:
        embeddings = self._build_embeddings(task_type)
        if not embeddings:
            return []

        try:
            if task_type == "RETRIEVAL_DOCUMENT":
                vectors = embeddings.embed_documents([content])
                return vectors[0] if vectors else []
            return embeddings.embed_query(content)
        except Exception as exc:
            logger.warning("Failed to embed schema content with LangChain: %s", exc)
            return []
