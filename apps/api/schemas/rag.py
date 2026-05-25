"""
rag.py

Pydantic schemas for QurioDB RAG indexing and retrieval endpoints.
"""

from typing import Dict, List, Optional

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


class RagIngestUrlRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    title: Optional[str] = Field(default=None, max_length=240)
    databaseId: Optional[str] = None
    sourceId: Optional[str] = None
    accessScope: str = "user"


class RagEvalCaseRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    query: str = Field(min_length=1)
    expectedCitations: List[str] = Field(default_factory=list, min_length=1)
    databaseId: Optional[str] = None
    sourceTypes: Optional[List[str]] = None
    topK: int = Field(default=8, ge=1, le=20)
    maxLatencyMs: int = Field(default=1500, ge=1, le=30000)


class RagEvaluateRequest(BaseModel):
    cases: List[RagEvalCaseRequest] = Field(min_length=1, max_length=100)


class RagPlanRequest(BaseModel):
    query: str = Field(min_length=1)
    databaseId: Optional[str] = None
    schema_name: str = "public"
    history: List[Dict[str, str]] = Field(default_factory=list, max_length=20)


class RagSyncDatabaseRequest(BaseModel):
    schema_name: str = "public"
    includeSavedQueries: bool = True
    includeQueryHistory: bool = False
    includeFailedHistory: bool = False
    queryHistoryLimit: int = Field(default=100, ge=1, le=500)
