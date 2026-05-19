"""
rag.py

Pydantic schemas for QurioDB RAG indexing and retrieval endpoints.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class RagRetrieveRequest(BaseModel):
    query: str
    databaseId: Optional[str] = None
    sourceTypes: Optional[List[str]] = None
    topK: int = Field(default=8, ge=1, le=20)
    candidateLimit: int = Field(default=32, ge=1, le=100)


class RagIndexSavedQueriesRequest(BaseModel):
    databaseId: str


class RagIndexQueryHistoryRequest(BaseModel):
    databaseId: str
    includeFailed: bool = False
    limit: int = Field(default=100, ge=1, le=500)


class RagIndexSourceRequest(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    content: str = Field(min_length=1)
    sourceType: str = "document"
    databaseId: Optional[str] = None
    uri: Optional[str] = None
    sourceId: Optional[str] = None
    accessScope: str = "user"
