"""
schema_retriever.py

Service for semantic schema linking using RAG.
Identifies relevant tables for a user's SQL natural language request.
"""
import os
import uuid
import math
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

from models.metadata import SessionLocal, SchemaEmbedding, Db, UserAIConfig
from services.metadata import metadata_service
from services.ai.base import _get_system_api_key

logger = logging.getLogger(__name__)

class SchemaRetriever:
    """
    Handles indexing and weighted retrieval of schema elements.
    Uses Google embeddings for semantic similarity.
    """

    def __init__(self):
        self.embedding_model = "models/gemini-embedding-2-preview"
        api_key = _get_system_api_key()
        if HAS_GENAI and api_key:
            genai.configure(api_key=api_key)

    def index_database(self, database_id: str, schema: str = "public"):
        """
        Creates/Refreshes semantic indices for all tables in a database.
        """
        if not HAS_GENAI or not genai:
            return False

        # Re-configure in case key changed
        api_key = _get_system_api_key()
        if api_key: genai.configure(api_key=api_key)

        session = SessionLocal()
        try:
            # Fetch all columns to build representative text for each table
            table_columns = metadata_service.get_all_columns(database_id, schema)
            
            # Remove existing indices for this DB/schema to avoid duplicates on refresh
            session.query(SchemaEmbedding).filter_by(databaseId=database_id, schema=schema).delete()
            
            for table_name, cols in table_columns.items():
                # Build a descriptive string: "Table [name] with columns: [col1], [col2], ..."
                col_names = ", ".join([c['name'] for c in cols])
                search_text = f"Table {table_name} with columns: {col_names}"
                
                # Get embeddings
                # Note: GenAI content generation might be rate limited; batching would be better for LARGE schemas
                embedding_res = genai.embed_content(
                    model=self.embedding_model,
                    content=search_text,
                    task_type="RETRIEVAL_DOCUMENT"
                )
                
                vector = embedding_res.get('embedding', [])
                
                embedding_entry = SchemaEmbedding(
                    id=str(uuid.uuid4()),
                    databaseId=database_id,
                    schema=schema,
                    tableName=table_name,
                    tableDescription=search_text,
                    embedding=vector
                )
                session.add(embedding_entry)
            
            session.commit()
            logger.info(f"Indexed {len(table_columns)} tables for database {database_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to index database {database_id}: {e}")
            session.rollback()
            return False
        finally:
            session.close()

    def get_relevant_tables(self, database_id: str, intent: str, schema: str = "public", top_k: int = 5) -> List[str]:
        """
        Returns the most relevant table names using semantic similarity.
        """
        if not HAS_GENAI or not genai:
            return []

        # Re-configure in case key changed
        api_key = _get_system_api_key()
        if api_key: genai.configure(api_key=api_key)

        session = SessionLocal()
        try:
            # 1. Get embedding for the user intent
            embedding_res = genai.embed_content(
                model=self.embedding_model,
                content=intent,
                task_type="RETRIEVAL_QUERY"
            )
            query_vector = embedding_res.get('embedding', [])
            
            # 2. Fetch all table embeddings for this DB
            stored_embeddings = session.query(SchemaEmbedding).filter_by(databaseId=database_id, schema=schema).all()
            
            if not stored_embeddings:
                # If no indexing has been done, index now (lazy indexing)
                logger.info(f"Triggering lazy indexing for {database_id}")
                self.index_database(database_id, schema)
                stored_embeddings = session.query(SchemaEmbedding).filter_by(databaseId=database_id, schema=schema).all()

            if not stored_embeddings:
                return []

            # 3. Calculate Cosine Similarity
            scored_tables = []
            for entry in stored_embeddings:
                sim = self._cosine_similarity(query_vector, entry.embedding)
                scored_tables.append((entry.tableName, sim))
            
            # 4. Sort and return top K
            scored_tables.sort(key=lambda x: x[1], reverse=True)
            return [t[0] for t in scored_tables[:top_k]]

        except Exception as e:
            logger.error(f"Error retrieving relevant tables: {e}")
            return []
        finally:
            session.close()

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """Pure Python cosine similarity calculation."""
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(v1, v2))
        magnitude_v1 = math.sqrt(sum(a * a for a in v1))
        magnitude_v2 = math.sqrt(sum(b * b for b in v2))
        
        if magnitude_v1 == 0 or magnitude_v2 == 0:
            return 0.0
            
        return dot_product / (magnitude_v1 * magnitude_v2)

schema_retriever = SchemaRetriever()
