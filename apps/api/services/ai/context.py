"""
context.py

Schema context generator for AI services, including RAG-based table selection
and sample data injection.
"""
import logging
import os
from dataclasses import dataclass
from typing import Optional, Dict, List, Any
from datetime import datetime
from sqlalchemy import text

from models.metadata import SessionLocal
from services.metadata import metadata_service
from services.base_service import BaseDatabaseService
from services.schema_retriever import TableRetrievalResult, schema_retriever

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SchemaContextResult:
    """Schema prompt context plus retrieval trace metadata."""

    context: str
    retrieval_trace: Dict[str, Any]


class SchemaContextService:
    """Provides structured database schema context for AI prompts."""

    def __init__(self):
        self._schema_cache = {} # db_id:schema -> {timestamp, context}
        self._cache_ttl_minutes = 10

    def format_schema_context(self, db_id: str, schema: str, intent: Optional[str] = None) -> str:
        """Returns schema context text for existing callers."""
        return self.build_schema_context(db_id, schema, intent=intent).context

    def build_schema_context(self, db_id: str, schema: str, intent: Optional[str] = None) -> SchemaContextResult:
        """Constructs a rich, dialect-aware schema context with RAG-based selection."""
        # Use semantic retrieval if intent is provided
        relevant_tables = []
        retrieval_results: List[TableRetrievalResult] = []
        if intent:
            table_budget = self._table_budget()
            retrieval_results = schema_retriever.retrieve_relevant_tables(
                db_id,
                intent,
                schema,
                top_k=table_budget,
                candidate_limit=self._candidate_budget(table_budget),
            )
            relevant_tables = [result.table_name for result in retrieval_results]
            logger.info(f"RAG Context: Selected {len(relevant_tables)} tables for intent.")

        # Cache check for non-specific requests
        if not intent:
            cache_key = f"{db_id}:{schema}"
            if cache_key in self._schema_cache:
                entry = self._schema_cache[cache_key]
                if (datetime.now() - entry["timestamp"]).seconds < (self._cache_ttl_minutes * 60):
                    return SchemaContextResult(
                        context=entry["context"],
                        retrieval_trace=self._build_retrieval_trace(intent, schema, []),
                    )

        # 1. Fetch metadata
        all_cols = metadata_service.get_all_columns(db_id, schema)
        if not all_cols:
            return SchemaContextResult(
                context="No schema metadata available.",
                retrieval_trace=self._build_retrieval_trace(intent, schema, retrieval_results),
            )
            
        # 2. Filter by relevance (RAG)
        if relevant_tables:
            target_cols = self._filter_tables(all_cols, relevant_tables, db_id, schema)
        else:
            target_cols = all_cols

        # 3. Fetch dialect and build DDL with samples
        db_type = self._get_db_type(db_id)
        all_fks = metadata_service.get_all_foreign_keys(db_id, schema)
        
        context = [f"DATABASE DIALECT: {db_type.upper()}"]
        if retrieval_results:
            context.extend(self._format_retrieval_notes(retrieval_results))
        context.append("SCHEMA STRUCTURE:")
        db_service = BaseDatabaseService()
        
        count = 0
        for table, columns in target_cols.items():
            if count >= 30: break
            
            # Format DDL
            table_def = self._build_table_ddl(table, columns, all_fks)
            
            # Fetch sample rows (Limit to first 5 tables to improve speed)
            samples = None
            if count < 5:
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
            
        return SchemaContextResult(
            context=context_str,
            retrieval_trace=self._build_retrieval_trace(intent, schema, retrieval_results),
        )

    def _format_retrieval_notes(self, results: List[TableRetrievalResult]) -> List[str]:
        """Formats compact retrieval evidence for the model prompt."""
        notes = ["RETRIEVAL NOTES:"]
        for result in results:
            terms = ", ".join(result.matched_terms) if result.matched_terms else "semantic match"
            notes.append(
                f"- {result.table_name}: score={result.score:.4f}, "
                f"semantic={result.semantic_score:.3f}, lexical={result.lexical_score:.3f}, "
                f"matched={terms}"
            )
        return notes

    def _build_retrieval_trace(
        self,
        intent: Optional[str],
        schema: str,
        results: List[TableRetrievalResult],
    ) -> Dict[str, Any]:
        """Builds a safe trace payload for API responses and stream activity."""
        return {
            "intent": intent or "",
            "schema": schema,
            "tableBudget": self._table_budget(),
            "candidateBudget": self._candidate_budget(self._table_budget()),
            "tables": [result.to_trace_item() for result in results],
        }

    def _table_budget(self) -> int:
        """Returns the final table budget for prompt context."""
        return self._int_env("QURIODB_RAG_TABLE_BUDGET", 8, minimum=1, maximum=30)

    def _candidate_budget(self, table_budget: int) -> int:
        """Returns broad retrieval candidate budget before reranking."""
        default_budget = max(table_budget * 3, 12)
        return self._int_env("QURIODB_RAG_CANDIDATE_BUDGET", default_budget, minimum=table_budget, maximum=60)

    def _int_env(self, name: str, default: int, minimum: int, maximum: int) -> int:
        """Parses bounded integer environment config."""
        try:
            value = int(os.getenv(name, str(default)))
        except ValueError:
            value = default
        return max(minimum, min(maximum, value))

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
            if schema:
                ref = f"{quote}{schema}{quote}.{quote}{table}{quote}"
            else:
                ref = f"{quote}{table}{quote}"
            res = conn.execute(text(f"SELECT * FROM {ref} LIMIT 3"))
            return {"columns": list(res.keys()), "rows": [list(r) for r in res.fetchall()]}
        except Exception as e:
            logger.debug(f"Sample fetch failed for {table}: {e}")
            return None

schema_context_service = SchemaContextService()
