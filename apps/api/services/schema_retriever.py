"""
schema_retriever.py

Service for semantic schema linking using RAG.
Identifies relevant tables for a user's SQL natural language request.
"""
import uuid
import logging
from typing import List, Dict, Optional

from models.metadata import SessionLocal, SchemaEmbedding
from services.ai.retrieval import TableRetrievalResult
from services.ai.retrieval.embedding_gateway import GeminiEmbeddingGateway
from services.ai.retrieval.metadata_source import SchemaMetadataSource
from services.ai.retrieval.ranking import cosine_similarity, fuse_scores, rerank_tables
from services.ai.retrieval.text import (
    build_reasons,
    build_table_search_text,
    column_names,
    expand_query_terms,
    foreign_keys_for_table,
    lexical_score,
    matched_terms,
)

logger = logging.getLogger(__name__)


class SchemaRetriever:
    """Coordinates schema indexing and hybrid table retrieval."""

    def __init__(
        self,
        metadata_source: Optional[SchemaMetadataSource] = None,
        embedding_gateway: Optional[GeminiEmbeddingGateway] = None,
    ):
        self.metadata = metadata_source or SchemaMetadataSource()
        self.embeddings = embedding_gateway or GeminiEmbeddingGateway()

    def index_database(self, database_id: str, schema: str = "public"):
        """Creates or refreshes semantic indices for all tables in a database."""
        if not self.embeddings.is_available():
            return False

        session = SessionLocal()
        try:
            table_columns = self.metadata.get_all_columns(database_id, schema)
            db_type = self.metadata.get_db_type(database_id)
            all_fks = self.metadata.get_all_foreign_keys(database_id, schema)
            session.query(SchemaEmbedding).filter_by(databaseId=database_id, schema=schema).delete()
            
            for table_name, cols in table_columns.items():
                search_text = build_table_search_text(
                    table_name,
                    cols,
                    db_type=db_type,
                    foreign_keys=foreign_keys_for_table(table_name, all_fks),
                    indexes=self.metadata.get_indexes(database_id, schema, table_name),
                )
                
                embedding_entry = SchemaEmbedding(
                    id=str(uuid.uuid4()),
                    databaseId=database_id,
                    schema=schema,
                    tableName=table_name,
                    tableDescription=search_text,
                    embedding=self.embeddings.embed_document(search_text)
                )
                session.add(embedding_entry)
            
            session.commit()
            logger.info(f"Indexed {len(table_columns)} tables for database {database_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to index database {database_id}: {e}")
            if session:
                session.rollback()
            return False
        finally:
            if session:
                session.close()

    def get_relevant_tables(self, database_id: str, intent: str, schema: str = "public", top_k: int = 5) -> List[str]:
        """Returns the most relevant table names using hybrid retrieval."""
        return [
            result.table_name
            for result in self.retrieve_relevant_tables(database_id, intent, schema, top_k)
        ]

    def retrieve_relevant_tables(
        self,
        database_id: str,
        intent: str,
        schema: str = "public",
        top_k: int = 5,
        candidate_limit: Optional[int] = None,
    ) -> List[TableRetrievalResult]:
        """Returns ranked tables using semantic similarity, keyword search, and RRF."""
        if not intent or not intent.strip():
            return []

        expanded_terms = expand_query_terms(intent)
        stored_embeddings = self._load_or_build_embeddings(database_id, schema)
        descriptions = {
            entry.tableName: entry.tableDescription or ""
            for entry in stored_embeddings
        }

        all_columns = self.metadata.get_all_columns(database_id, schema)
        db_type = self.metadata.get_db_type(database_id)
        all_fks = self.metadata.get_all_foreign_keys(database_id, schema)
        indexes_by_table = self.metadata.get_indexes_for_tables(database_id, schema, all_columns.keys())
        for table_name, columns in all_columns.items():
            descriptions.setdefault(
                table_name,
                build_table_search_text(
                    table_name,
                    columns,
                    db_type=db_type,
                    foreign_keys=foreign_keys_for_table(table_name, all_fks),
                    indexes=indexes_by_table.get(table_name, []),
                ),
            )

        if not descriptions:
            return []

        semantic_scores = self._semantic_scores(intent, stored_embeddings)
        lexical_scores = {
            table_name: lexical_score(intent, expanded_terms, description)
            for table_name, description in descriptions.items()
        }

        ranked_tables = fuse_scores(semantic_scores, lexical_scores)
        retrieval_limit = max(top_k, candidate_limit or top_k)
        ranked_tables = ranked_tables[:retrieval_limit]
        ranked_tables = rerank_tables(intent, ranked_tables, descriptions)
        results = []
        for table_name, score in ranked_tables[:top_k]:
            table_matched_terms = matched_terms(expanded_terms, descriptions.get(table_name, ""))
            table_columns = column_names(all_columns.get(table_name, []))
            results.append(TableRetrievalResult(
                table_name=table_name,
                score=score,
                semantic_score=semantic_scores.get(table_name, 0.0),
                lexical_score=lexical_scores.get(table_name, 0.0),
                matched_terms=table_matched_terms[:8],
                schema_name=schema,
                columns=table_columns[:24],
                reasons=build_reasons(table_name, table_matched_terms, descriptions.get(table_name, "")),
            ))

        return results

    def _load_or_build_embeddings(self, database_id: str, schema: str) -> List[SchemaEmbedding]:
        """Loads stored table embeddings, lazily indexing when Gemini is configured."""
        if not self.embeddings.is_available():
            return []

        session = SessionLocal()
        try:
            stored_embeddings = session.query(SchemaEmbedding).filter_by(databaseId=database_id, schema=schema).all()
            
            if not stored_embeddings:
                logger.info(f"Triggering lazy indexing for {database_id}")
                self.index_database(database_id, schema)
                stored_embeddings = session.query(SchemaEmbedding).filter_by(databaseId=database_id, schema=schema).all()

            return stored_embeddings

        except Exception as e:
            logger.error(f"Error loading schema embeddings: {e}")
            return []
        finally:
            if session:
                session.close()

    def _semantic_scores(self, intent: str, stored_embeddings: List[SchemaEmbedding]) -> Dict[str, float]:
        """Scores stored embeddings against the user intent."""
        if not stored_embeddings or not self.embeddings.is_available():
            return {}

        try:
            query_vector = self.embeddings.embed_query(intent)
            return {
                entry.tableName: cosine_similarity(query_vector, entry.embedding)
                for entry in stored_embeddings
            }
        except Exception as e:
            logger.warning("Semantic schema retrieval failed; using lexical signals only: %s", e)
            return {}

schema_retriever = SchemaRetriever()
