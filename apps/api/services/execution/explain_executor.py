"""
explain_executor.py

Specialized executor for relational SQL EXPLAIN plans via SQLAlchemy.
"""

import logging
from typing import Dict, Any, Tuple
from sqlalchemy import text

logger = logging.getLogger(__name__)

class ExplainExecutor:
    """Handles execution of EXPLAIN plans across diverse relational dialects via SQLAlchemy."""

    def __init__(self, service):
        self.service = service

    def execute(self, db_id: str, sql: str) -> Dict[str, Any]:
        """Wraps SQLAlchemy's execute call with dialect-specific logic for EXPLAIN formatting."""
        def _op(conn):
            dialect = conn.engine.dialect.name
            
            explain_sql = sql.strip()
            if explain_sql.endswith(';'):
                explain_sql = explain_sql[:-1]

            # Dialect-specific EXPLAIN syntax
            if dialect == 'postgresql':
                explain_sql = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {explain_sql}"
            elif dialect == 'mysql':
                explain_sql = f"EXPLAIN FORMAT=JSON {explain_sql}"
            else:
                explain_sql = f"EXPLAIN {explain_sql}"

            if dialect == 'postgresql':
                conn.execute(text("SET statement_timeout = '30s'"))

            result = conn.execute(text(explain_sql))
            
            # Extract JSON plan and dialect metadata
            if result.returns_rows:
                rows = [row for row in result]
                if dialect in ['postgresql', 'mysql'] and rows:
                    if dialect == 'postgresql':
                        # Postgres EXPLAIN (..., FORMAT JSON) returns an array with a JSON object at rows[0][0]
                        return {"plan": rows[0][0], "dialect": dialect}
                    if dialect == 'mysql':
                        # MySQL EXPLAIN FORMAT=JSON returns a string representation of a JSON object at rows[0][0]
                        import json
                        try:
                            return {"plan": json.loads(rows[0][0]), "dialect": dialect}
                        except Exception as e:
                            logger.error(f"Failed to parse MySQL JSON EXPLAIN plan: {e}")
                
                # Fallback for plain text EXPLAIN
                keys = list(result.keys())
                data = [dict(zip(keys, row)) for row in rows]
                return {"plan": data, "dialect": dialect}
                
            return {"plan": None, "dialect": dialect}
                
        return self.service.run_dynamic_query(db_id, _op)
