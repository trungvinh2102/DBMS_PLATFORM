"""
index_service.py

Generalized RAG indexing service for schema metadata and saved SQL knowledge.
"""

import datetime
import uuid
from typing import Any, Dict, Iterable, List, Optional

from models import QueryHistory, RagChunk, RagEmbedding, RagSource, SavedQuery, SessionLocal

from .embedding_gateway import GeminiEmbeddingGateway
from .index_documents import (
    build_text_document_chunks,
    build_query_history_chunk,
    build_saved_query_chunk,
    build_schema_chunks,
    content_hash,
    rough_token_count,
)
from .metadata_source import SchemaMetadataSource
from .sqlite_vec_store import sqlite_vec_store
from .vector_store import resolve_vector_store_config


class RagIndexService:
    """Builds source-agnostic RAG chunks while preserving desktop-safe storage."""

    def __init__(
        self,
        metadata_source: Optional[SchemaMetadataSource] = None,
        embedding_gateway: Optional[GeminiEmbeddingGateway] = None,
    ):
        self.metadata = metadata_source or SchemaMetadataSource()
        self.embeddings = embedding_gateway or GeminiEmbeddingGateway()

    def index_database_schema(self, database_id: str, schema: str = "public", user_id: Optional[str] = None) -> Dict[str, Any]:
        """Indexes table-level schema chunks for a connected database."""
        schema = schema or "public"
        table_columns = self.metadata.get_all_columns(database_id, schema)
        db_type = self.metadata.get_db_type(database_id)
        foreign_keys = self.metadata.get_all_foreign_keys(database_id, schema)
        indexes_by_table = self.metadata.get_indexes_for_tables(database_id, schema, table_columns.keys())
        chunks = build_schema_chunks(database_id, schema, table_columns, db_type, foreign_keys, indexes_by_table)

        source_id = f"database_schema:{database_id}:{schema}"
        title = f"{schema} schema"
        return self._upsert_source_with_chunks(
            source_id=source_id,
            source_type="database_schema",
            database_id=database_id,
            user_id=user_id,
            title=title,
            uri=f"database://{database_id}/{schema}",
            access_scope="database",
            chunks=chunks,
        )

    def index_saved_queries(self, database_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Indexes saved SQL queries owned by the current user or shared locally."""
        session = SessionLocal()
        try:
            query = session.query(SavedQuery).filter(SavedQuery.databaseId == database_id)
            if user_id:
                query = query.filter((SavedQuery.userId == user_id) | (SavedQuery.userId.is_(None)))
            saved_queries = query.order_by(SavedQuery.changed_on.desc()).all()
            results = []
            for saved_query in saved_queries:
                results.append(self.index_saved_query(saved_query.id, user_id=user_id))
            return {
                "databaseId": database_id,
                "sourceType": "saved_query",
                "indexedSources": len(results),
                "chunkCount": sum(result.get("chunkCount", 0) for result in results),
                "embeddingCount": sum(result.get("embeddingCount", 0) for result in results),
            }
        finally:
            session.close()

    def index_saved_query(self, saved_query_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Indexes a single saved query as reusable SQL knowledge."""
        session = SessionLocal()
        try:
            saved_query = session.get(SavedQuery, saved_query_id)
            if not saved_query:
                return {"sourceType": "saved_query", "status": "missing", "chunkCount": 0, "embeddingCount": 0}
            if saved_query.userId and user_id and saved_query.userId != user_id:
                return {"sourceType": "saved_query", "status": "forbidden", "chunkCount": 0, "embeddingCount": 0}

            source_id = f"saved_query:{saved_query.id}"
            return self._upsert_source_with_chunks(
                source_id=source_id,
                source_type="saved_query",
                database_id=saved_query.databaseId,
                user_id=saved_query.userId,
                title=saved_query.name,
                uri=f"saved-query://{saved_query.id}",
                access_scope="user" if saved_query.userId else "database",
                chunks=[build_saved_query_chunk(saved_query)],
            )
        finally:
            session.close()

    def index_query_history(self, database_id: str, include_failed: bool = False, limit: int = 100) -> Dict[str, Any]:
        """Indexes masked query history behind explicit user action."""
        session = SessionLocal()
        try:
            query = session.query(QueryHistory).filter(QueryHistory.databaseId == database_id)
            if not include_failed:
                query = query.filter(QueryHistory.status == "SUCCESS")
            history_items = query.order_by(QueryHistory.created_on.desc()).limit(limit).all()
            results = []
            for history_item in history_items:
                results.append(self.index_query_history_item(history_item.id))
            return {
                "databaseId": database_id,
                "sourceType": "query_history",
                "indexedSources": len(results),
                "chunkCount": sum(result.get("chunkCount", 0) for result in results),
                "embeddingCount": sum(result.get("embeddingCount", 0) for result in results),
            }
        finally:
            session.close()

    def index_query_history_item(self, history_id: str) -> Dict[str, Any]:
        """Indexes one query history item after masking literal values."""
        session = SessionLocal()
        try:
            history_item = session.get(QueryHistory, history_id)
            if not history_item:
                return {"sourceType": "query_history", "status": "missing", "chunkCount": 0, "embeddingCount": 0}

            source_id = f"query_history:{history_item.id}"
            return self._upsert_source_with_chunks(
                source_id=source_id,
                source_type="query_history",
                database_id=history_item.databaseId,
                user_id=None,
                title=f"Query history {history_item.id[:8]}",
                uri=f"query-history://{history_item.id}",
                access_scope="database",
                chunks=[build_query_history_chunk(history_item)],
            )
        finally:
            session.close()

    def index_text_source(
        self,
        source_type: str,
        title: str,
        content: str,
        database_id: Optional[str] = None,
        user_id: Optional[str] = None,
        uri: Optional[str] = None,
        source_id: Optional[str] = None,
        access_scope: str = "user",
    ) -> Dict[str, Any]:
        """Indexes a user-provided document or web/manual text source."""
        safe_source_type = source_type if source_type in {"document", "web_page"} else "document"
        stable_id = source_id or f"{safe_source_type}:{uuid.uuid4()}"
        chunks = build_text_document_chunks(stable_id, title, content, safe_source_type, uri)
        if not chunks:
            return {"sourceId": stable_id, "sourceType": safe_source_type, "status": "empty", "chunkCount": 0, "embeddingCount": 0}

        return self._upsert_source_with_chunks(
            source_id=stable_id,
            source_type=safe_source_type,
            database_id=database_id,
            user_id=user_id,
            title=title,
            uri=uri or f"{safe_source_type}://{stable_id}",
            access_scope=access_scope,
            chunks=chunks,
        )

    def _upsert_source_with_chunks(
        self,
        source_id: str,
        source_type: str,
        database_id: Optional[str],
        user_id: Optional[str],
        title: str,
        uri: str,
        access_scope: str,
        chunks: Iterable[Dict[str, Any]],
    ) -> Dict[str, Any]:
        if not resolve_vector_store_config().enabled:
            return {"sourceId": source_id, "sourceType": source_type, "status": "disabled", "chunkCount": 0, "embeddingCount": 0}

        chunk_payloads = list(chunks)
        source_hash = content_hash("\n\n".join(chunk["content"] for chunk in chunk_payloads))
        session = SessionLocal()
        try:
            source = session.get(RagSource, source_id)
            if not source:
                source = RagSource(id=source_id, sourceType=source_type)
                session.add(source)

            source.databaseId = database_id
            source.userId = user_id
            source.title = title
            source.uri = uri
            source.contentHash = source_hash
            source.accessScope = access_scope
            source.status = "indexed"
            source.indexed_on = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)

            session.query(RagEmbedding).filter(
                RagEmbedding.chunkId.in_(
                    session.query(RagChunk.id).filter(RagChunk.sourceId == source_id)
                )
            ).delete(synchronize_session=False)
            sqlite_vec_store.delete_source(session, source_id)
            session.query(RagChunk).filter(RagChunk.sourceId == source_id).delete()

            embedding_count = 0
            for chunk in chunk_payloads:
                chunk_id = str(uuid.uuid4())
                content = chunk["content"]
                rag_chunk = RagChunk(
                    id=chunk_id,
                    sourceId=source_id,
                    chunkType=chunk["chunkType"],
                    objectName=chunk.get("objectName"),
                    schemaName=chunk.get("schemaName"),
                    content=content,
                    metadataJson=chunk.get("metadataJson") or {},
                    tokenCount=rough_token_count(content),
                    ordinal=chunk.get("ordinal") or 0,
                    contentHash=content_hash(content),
                )
                session.add(rag_chunk)
                embedding_count += self._add_embedding_if_available(session, rag_chunk)

            session.commit()
            return {
                "sourceId": source_id,
                "sourceType": source_type,
                "status": source.status,
                "chunkCount": len(chunk_payloads),
                "embeddingCount": embedding_count,
            }
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def _add_embedding_if_available(self, session, chunk: RagChunk) -> int:
        if not self.embeddings.is_available():
            return 0

        vector = self.embeddings.embed_document(chunk.content)
        if not vector:
            return 0

        session.add(RagEmbedding(
            id=str(uuid.uuid4()),
            chunkId=chunk.id,
            embeddingModel=self.embeddings.model,
            embeddingProvider="google",
            dimensions=len(vector),
            vectorJson=vector,
        ))
        source = session.get(RagSource, chunk.sourceId)
        if source:
            sqlite_vec_store.upsert_embedding(session, chunk, source, vector)
        return 1


rag_index_service = RagIndexService()
