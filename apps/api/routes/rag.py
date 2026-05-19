"""
rag.py

Debug and indexing routes for QurioDB's generalized RAG layer.
"""

from fastapi import APIRouter, Depends, HTTPException

from schemas.rag import RagIndexQueryHistoryRequest, RagIndexSavedQueriesRequest, RagIndexSourceRequest, RagRetrieveRequest
from services.ai.retrieval.index_service import rag_index_service
from services.ai.retrieval.retrieval_service import rag_retrieval_service
from services.ai.retrieval.vector_store import resolve_vector_store_config
from utils.auth_middleware import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/status")
def get_rag_status():
    """Reports RAG backend configuration without exposing secrets."""
    return {"vectorStore": resolve_vector_store_config().to_status()}


@router.post("/index/database/{database_id}")
def index_database(database_id: str, schema: str = "public", current_user: dict = Depends(get_current_user)):
    """Rebuilds generalized schema chunks for a database."""
    return rag_index_service.index_database_schema(
        database_id,
        schema=schema or "public",
        user_id=current_user.get("userId"),
    )


@router.post("/index/saved-queries")
def index_saved_queries(data: RagIndexSavedQueriesRequest, current_user: dict = Depends(get_current_user)):
    """Indexes saved SQL queries visible to the current user."""
    return rag_index_service.index_saved_queries(
        data.databaseId,
        user_id=current_user.get("userId"),
    )


@router.post("/index/query-history")
def index_query_history(data: RagIndexQueryHistoryRequest):
    """Indexes masked query history after explicit user/admin action."""
    return rag_index_service.index_query_history(
        data.databaseId,
        include_failed=data.includeFailed,
        limit=data.limit,
    )


@router.post("/index/source")
def index_source(data: RagIndexSourceRequest, current_user: dict = Depends(get_current_user)):
    """Adds or refreshes a user-provided document/web source."""
    return rag_index_service.index_text_source(
        data.sourceType,
        data.title,
        data.content,
        database_id=data.databaseId,
        user_id=current_user.get("userId"),
        uri=data.uri,
        source_id=data.sourceId,
        access_scope=data.accessScope,
    )


@router.get("/sources")
def list_sources(
    databaseId: str | None = None,
    sourceType: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    """Lists visible RAG sources and indexing status."""
    return rag_retrieval_service.list_sources(
        database_id=databaseId,
        user_id=current_user.get("userId"),
        source_type=sourceType,
    )


@router.get("/sources/{source_id}")
def get_source(source_id: str, current_user: dict = Depends(get_current_user)):
    """Inspects one visible indexed source and its chunk metadata."""
    source = rag_retrieval_service.get_source(source_id, user_id=current_user.get("userId"))
    if not source:
        raise HTTPException(status_code=404, detail="RAG source not found")
    return source


@router.delete("/sources/{source_id}")
def delete_source(source_id: str, current_user: dict = Depends(get_current_user)):
    """Removes one visible indexed source and its chunks."""
    result = rag_retrieval_service.delete_source(source_id, user_id=current_user.get("userId"))
    if result.get("reason") == "not_found":
        raise HTTPException(status_code=404, detail="RAG source not found")
    if result.get("reason") == "forbidden":
        raise HTTPException(status_code=403, detail="RAG source is not visible to this user")
    return result


@router.post("/retrieve")
def retrieve(data: RagRetrieveRequest, current_user: dict = Depends(get_current_user)):
    """Runs debug retrieval without invoking a model."""
    return rag_retrieval_service.retrieve(
        data.query,
        database_id=data.databaseId,
        user_id=current_user.get("userId"),
        source_types=data.sourceTypes,
        top_k=data.topK,
        candidate_limit=data.candidateLimit,
    )


@router.get("/events/{message_id}")
def get_retrieval_events(message_id: str, current_user: dict = Depends(get_current_user)):
    """Returns safe retrieval trace events for one assistant message."""
    return rag_retrieval_service.get_retrieval_events(
        message_id,
        user_id=current_user.get("userId"),
    )
