"""
retrieval_service.py

Hybrid retrieval over QurioDB's generalized RAG index.
"""

import time
from typing import Any, Dict, List, Optional

from models import RagChunk, RagEmbedding, RagRetrievalEvent, RagSource, SessionLocal

from .embedding_gateway import GeminiEmbeddingGateway
from .ranking import fuse_scores
from .reranking import DeterministicRagReranker, RagReranker
from .sqlite_vec_store import sqlite_vec_store
from .text import build_reasons, expand_query_terms, lexical_score, matched_terms
from .types import RagRetrievalResult
from .vector_store import resolve_vector_store_config


class RagRetrievalService:
    """Retrieves permission-filtered RAG chunks with lexical and semantic signals."""

    def __init__(
        self,
        embedding_gateway: Optional[GeminiEmbeddingGateway] = None,
        reranker: Optional[RagReranker] = None,
    ):
        self.embeddings = embedding_gateway or GeminiEmbeddingGateway()
        self.reranker = reranker or DeterministicRagReranker()

    def retrieve(
        self,
        query_text: str,
        database_id: Optional[str] = None,
        user_id: Optional[str] = None,
        source_types: Optional[List[str]] = None,
        top_k: int = 8,
        candidate_limit: int = 32,
    ) -> Dict[str, Any]:
        """Returns ranked chunks, citations, and a safe retrieval trace."""
        started = time.perf_counter()
        vector_config = resolve_vector_store_config()
        if not vector_config.enabled:
            return self._disabled_result(query_text, database_id, started)
        if not query_text or not query_text.strip():
            return self._empty_result(query_text, database_id, started)

        session = SessionLocal()
        try:
            rows = self._load_candidate_rows(session, database_id, user_id, source_types)
            if not rows:
                return self._empty_result(query_text, database_id, started)

            expanded_terms = expand_query_terms(query_text)
            lexical_scores = {
                chunk.id: lexical_score(query_text, expanded_terms, chunk.content)
                for source, chunk, _embedding in rows
            }
            semantic_scores = self._semantic_scores(
                session,
                query_text,
                rows,
                database_id=database_id,
                user_id=user_id,
                source_types=source_types,
                candidate_limit=candidate_limit,
            )
            candidate_budget = max(top_k, candidate_limit)
            fused = fuse_scores(semantic_scores, lexical_scores)[:candidate_budget]
            row_by_chunk_id = {chunk.id: (source, chunk, embedding) for source, chunk, embedding in rows}

            results = []
            for chunk_id, score in fused:
                source, chunk, _embedding = row_by_chunk_id[chunk_id]
                terms = matched_terms(expanded_terms, chunk.content)
                reasons = build_reasons(chunk.objectName or source.title, terms, chunk.content)
                results.append(RagRetrievalResult(
                    chunk_id=chunk.id,
                    source_id=source.id,
                    source_type=source.sourceType,
                    title=source.title,
                    content=chunk.content,
                    score=score,
                    semantic_score=semantic_scores.get(chunk.id, 0.0),
                    lexical_score=lexical_scores.get(chunk.id, 0.0),
                    matched_terms=terms[:8],
                    database_id=source.databaseId,
                    user_id=source.userId,
                    chunk_type=chunk.chunkType,
                    object_name=chunk.objectName,
                    schema_name=chunk.schemaName,
                    metadata=chunk.metadataJson or {},
                    reasons=reasons,
                ))

            reranked_results = self.reranker.rerank(query_text, results)[:top_k]
            trace = self._build_trace(
                query_text,
                database_id,
                rows,
                reranked_results,
                semantic_scores,
                started,
                candidate_budget=candidate_budget,
                ranked_candidate_count=len(results),
            )
            return {
                "items": [self._result_to_dict(result) for result in reranked_results],
                "citations": [result.to_citation() for result in reranked_results],
                "retrievalTrace": trace,
            }
        finally:
            session.close()

    def list_sources(
        self,
        database_id: Optional[str] = None,
        user_id: Optional[str] = None,
        source_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Lists visible indexed sources for diagnostics and future UI use."""
        session = SessionLocal()
        try:
            query = session.query(RagSource).order_by(RagSource.changed_on.desc())
            if database_id:
                query = query.filter(RagSource.databaseId == database_id)
            if source_type:
                query = query.filter(RagSource.sourceType == source_type)
            if user_id:
                query = query.filter((RagSource.userId == user_id) | (RagSource.userId.is_(None)))

            return [{
                "id": source.id,
                "sourceType": source.sourceType,
                "databaseId": source.databaseId,
                "userId": source.userId,
                "title": source.title,
                "uri": source.uri,
                "accessScope": source.accessScope,
                "status": source.status,
                "indexed_on": source.indexed_on.isoformat() if source.indexed_on else None,
                "changed_on": source.changed_on.isoformat() if source.changed_on else None,
            } for source in query.all()]
        finally:
            session.close()

    def get_source(self, source_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Returns source details and chunk metadata when visible to the user."""
        session = SessionLocal()
        try:
            source = session.get(RagSource, source_id)
            if not source or not self._can_access_source(source, user_id):
                return None
            chunks = session.query(RagChunk).filter(RagChunk.sourceId == source_id).order_by(RagChunk.ordinal.asc()).all()
            return {
                "id": source.id,
                "sourceType": source.sourceType,
                "databaseId": source.databaseId,
                "userId": source.userId,
                "title": source.title,
                "uri": source.uri,
                "accessScope": source.accessScope,
                "status": source.status,
                "indexed_on": source.indexed_on.isoformat() if source.indexed_on else None,
                "chunkCount": len(chunks),
                "chunks": [{
                    "id": chunk.id,
                    "chunkType": chunk.chunkType,
                    "objectName": chunk.objectName,
                    "schemaName": chunk.schemaName,
                    "tokenCount": chunk.tokenCount,
                    "ordinal": chunk.ordinal,
                    "metadata": chunk.metadataJson or {},
                } for chunk in chunks],
            }
        finally:
            session.close()

    def delete_source(self, source_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Deletes an indexed source and its chunks/embeddings when visible to the user."""
        session = SessionLocal()
        try:
            source = session.get(RagSource, source_id)
            if not source:
                return {"deleted": False, "reason": "not_found"}
            if not self._can_access_source(source, user_id):
                return {"deleted": False, "reason": "forbidden"}

            sqlite_vec_store.delete_source(session, source_id)
            chunk_ids = session.query(RagChunk.id).filter(RagChunk.sourceId == source_id)
            session.query(RagEmbedding).filter(RagEmbedding.chunkId.in_(chunk_ids)).delete(synchronize_session=False)
            session.query(RagChunk).filter(RagChunk.sourceId == source_id).delete()
            session.delete(source)
            session.commit()
            return {"deleted": True, "sourceId": source_id}
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_retrieval_events(self, message_id: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns safe local retrieval telemetry for one assistant message."""
        session = SessionLocal()
        try:
            events = session.query(RagRetrievalEvent)\
                .filter(RagRetrievalEvent.messageId == message_id)\
                .order_by(RagRetrievalEvent.created_on.desc())\
                .all()
            return [{
                "id": event.id,
                "conversationId": event.conversationId,
                "messageId": event.messageId,
                "databaseId": event.databaseId,
                "retrievalMode": event.retrievalMode,
                "candidateCount": event.candidateCount,
                "selectedCount": event.selectedCount,
                "latencyMs": event.latencyMs,
                "trace": event.trace or {},
                "created_on": event.created_on.isoformat() if event.created_on else None,
            } for event in events]
        finally:
            session.close()

    def _load_candidate_rows(
        self,
        session,
        database_id: Optional[str],
        user_id: Optional[str],
        source_types: Optional[List[str]],
    ):
        query = session.query(RagSource, RagChunk, RagEmbedding)\
            .join(RagChunk, RagChunk.sourceId == RagSource.id)\
            .outerjoin(RagEmbedding, RagEmbedding.chunkId == RagChunk.id)\
            .filter(RagSource.status == "indexed")
        if database_id:
            query = query.filter(RagSource.databaseId == database_id)
        if source_types:
            query = query.filter(RagSource.sourceType.in_(source_types))
        if user_id:
            query = query.filter((RagSource.userId == user_id) | (RagSource.userId.is_(None)))
        return query.all()

    def _can_access_source(self, source: RagSource, user_id: Optional[str]) -> bool:
        return not source.userId or not user_id or source.userId == user_id

    def _semantic_scores(
        self,
        session,
        query_text: str,
        rows,
        database_id: Optional[str] = None,
        user_id: Optional[str] = None,
        source_types: Optional[List[str]] = None,
        candidate_limit: int = 32,
    ) -> Dict[str, float]:
        if not self.embeddings.is_available():
            return {}

        query_vector = self.embeddings.embed_query(query_text)
        if not query_vector:
            return {}

        sqlite_vec_scores = sqlite_vec_store.semantic_scores(
            session,
            query_vector,
            database_id=database_id,
            user_id=user_id,
            source_types=source_types,
            k=max(candidate_limit, 32),
        )
        if not sqlite_vec_scores:
            return {}

        candidate_chunk_ids = {chunk.id for _source, chunk, _embedding in rows}
        return {
            chunk_id: score
            for chunk_id, score in sqlite_vec_scores.items()
            if chunk_id in candidate_chunk_ids
        }

    def _build_trace(
        self,
        query_text: str,
        database_id: Optional[str],
        rows,
        results,
        semantic_scores,
        started,
        candidate_budget: int,
        ranked_candidate_count: int,
    ) -> Dict[str, Any]:
        embeddings_available = self.embeddings.is_available()
        return {
            "intent": query_text,
            "databaseId": database_id,
            "retrievalMode": "hybrid" if semantic_scores else "lexical_fallback",
            "embeddingAvailable": embeddings_available,
            "fallbackReason": "" if embeddings_available else "embedding_provider_unavailable",
            "candidateCount": len(rows),
            "candidateBudget": candidate_budget,
            "rankedCandidateCount": ranked_candidate_count,
            "selectedCount": len(results),
            "latencyMs": int((time.perf_counter() - started) * 1000),
            "items": [result.to_trace_item() for result in results],
        }

    def _empty_result(self, query_text: str, database_id: Optional[str], started) -> Dict[str, Any]:
        return {
            "items": [],
            "citations": [],
            "retrievalTrace": {
                "intent": query_text or "",
                "databaseId": database_id,
                "retrievalMode": "empty",
                "candidateCount": 0,
                "selectedCount": 0,
                "latencyMs": int((time.perf_counter() - started) * 1000),
                "items": [],
            },
        }

    def _disabled_result(self, query_text: str, database_id: Optional[str], started) -> Dict[str, Any]:
        return {
            "items": [],
            "citations": [],
            "retrievalTrace": {
                "intent": query_text or "",
                "databaseId": database_id,
                "retrievalMode": "disabled",
                "fallbackReason": "rag_disabled",
                "candidateCount": 0,
                "selectedCount": 0,
                "latencyMs": int((time.perf_counter() - started) * 1000),
                "items": [],
            },
        }

    def _result_to_dict(self, result: RagRetrievalResult) -> Dict[str, Any]:
        return {
            **result.to_trace_item(),
            "content": result.content,
            "citation": result.to_citation(),
        }


rag_retrieval_service = RagRetrievalService()
