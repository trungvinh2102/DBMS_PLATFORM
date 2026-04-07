"""
context.py

Schema context generator for AI services, including RAG-based table selection
and sample data injection.
"""
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime
from sqlalchemy import text

from models.metadata import SessionLocal
from services.metadata import metadata_service
from services.base_service import BaseDatabaseService
from services.schema_retriever import schema_retriever

logger = logging.getLogger(__name__)

class SchemaContextService:
    """Provides structured database schema context for AI prompts."""

    def __init__(self):
        self._schema_cache = {} # db_id:schema -> {timestamp, context}
        self._cache_ttl_minutes = 10

    def format_schema_context(self, db_id: str, schema: str, intent: Optional[str] = None) -> str:
        """Constructs a rich, dialect-aware schema context with RAG-based selection."""
        # Use semantic retrieval if intent is provided
        relevant_tables = []
        if intent:
            relevant_tables = schema_retriever.get_relevant_tables(db_id, intent, schema, top_k=8)
            logger.info(f"RAG Context: Selected {len(relevant_tables)} tables for intent.")

        # Cache check for non-specific requests
        if not intent:
            cache_key = f"{db_id}:{schema}"
            if cache_key in self._schema_cache:
                entry = self._schema_cache[cache_key]
                if (datetime.now() - entry["timestamp"]).seconds < (self._cache_ttl_minutes * 60):
                    return entry["context"]

        # 1. Fetch metadata
        all_cols = metadata_service.get_all_columns(db_id, schema)
        if not all_cols:
            return "No schema metadata available."
            
        # 2. Filter by relevance (RAG)
        if relevant_tables:
            target_cols = self._filter_tables(all_cols, relevant_tables, db_id, schema)
        else:
            target_cols = all_cols

        # 3. Fetch dialect and build DDL with samples
        db_type = self._get_db_type(db_id)
        all_fks = metadata_service.get_all_foreign_keys(db_id, schema)
        
        context = [f"DATABASE DIALECT: {db_type.upper()}", "SCHEMA STRUCTURE:"]
        db_service = BaseDatabaseService()
        
        count = 0
        for table, columns in target_cols.items():
            if count >= 30: break
            
            # Format DDL
            table_def = self._build_table_ddl(table, columns, all_fks)
            
            # Fetch sample rows
            samples = db_service.run_dynamic_query(db_id, lambda conn: self._get_samples(conn, table, schema, db_type))
            if samples and samples.get("rows"):
                table_def.append("-- SAMPLE DATA (3 rows):")
                table_def.append(f"-- Columns: {', '.join(samples['columns'])}")
                for row in samples["rows"]:
                    clean_row = [str(v)[:50] + "..." if isinstance(v, str) and len(str(v)) > 50 else str(v) for v in row]
                    table_def.append(f"-- [{', '.join(clean_row)}]")

            context.append("\n".join(table_def))
            count += 1
            
        context_str = "\n\n".join(context)
        
        # Cache non-intent context
        if not intent:
            self._schema_cache[f"{db_id}:{schema}"] = {"timestamp": datetime.now(), "context": context_str}
            
        return context_str

    def _filter_tables(self, all_cols: Dict, relevant: List[str], db_id: str, schema: str) -> Dict:
        """Filters columns to relevant tables and their immediate neighbors via Foreign Keys."""
        filtered = {t: all_cols[t] for t in relevant if t in all_cols}
        fks = metadata_service.get_all_foreign_keys(db_id, schema)
        
        # Extend to include FK-related tables for joining capability
        related = set()
        for fk in fks:
            if fk['table'] in relevant: related.add(fk['foreignTable'])
            elif fk['foreignTable'] in relevant: related.add(fk['table'])
            
        for rt in related:
            if rt in all_cols and rt not in filtered:
                filtered[rt] = all_cols[rt]
        return filtered

    def _get_db_type(self, db_id: str) -> str:
        """Retrieves db type (dialect) safely."""
        session = SessionLocal()
        try:
            return BaseDatabaseService().get_db_config(db_id, session)[0]
        except Exception: return "SQL"
        finally:
            if session:
                session.close()


    def _build_table_ddl(self, table: str, columns: List[Dict], all_fks: List[Dict]) -> List[str]:
        """Simple DDL constructor."""
        col_strs = [f"{c['name']} {c['type']}" + (" NOT NULL" if not c.get('nullable') else "") for c in columns]
        ddl = [f'CREATE TABLE "{table}" (', *[f"  {s}" for s in col_strs]]
        
        # Filter matching FKs
        for fk in all_fks:
            if fk['table'] == table:
                ddl.append(f"  FOREIGN KEY ({fk['column']}) REFERENCES {fk['foreignTable']}({fk['foreignColumn']})")
        
        ddl.append(");")
        return ddl

    def _get_samples(self, conn, table: str, schema: str, db_type: str) -> Optional[Dict]:
        """Fetches up to 3 sample rows."""
        try:
            quote = '`' if db_type == 'mysql' else '"'
            ref = f"{quote}{schema}{quote}.{quote}{table}{quote}"
            res = conn.execute(text(f"SELECT * FROM {ref} LIMIT 3"))
            return {"columns": list(res.keys()), "rows": [list(r) for r in res.fetchall()]}
        except Exception as e:
            logger.debug(f"Sample fetch failed for {table}: {e}")
            return None

schema_context_service = SchemaContextService()
