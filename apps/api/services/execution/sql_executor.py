"""
sql_executor.py

Specialized executor for relational SQL queries using SQLAlchemy.
"""

import re
import logging
from typing import List, Dict, Any, Tuple
from sqlalchemy import text

logger = logging.getLogger(__name__)

class SqlExecutor:
    """Handles execution of SQL queries across diverse relational dialects via SQLAlchemy."""

    def __init__(self, service):
        self.service = service

    def execute(self, db_id: str, sql: str, limit: int, auto_commit: bool) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Wraps SQLAlchemy's execute call with dialect-specific logic for timeouts and result formatting."""
        def _op(conn):
            final_sql = self._prepare_sql(sql.strip(), limit, conn.engine.dialect.name)
            
            # Use appropriate isolation level for write operations if autocommit is requested
            exec_conn = conn
            if auto_commit and conn.engine.dialect.name not in ['clickhouse', 'clickhousedb', 'duckdb']:
                exec_conn = conn.execution_options(isolation_level="AUTOCOMMIT")

            # Dialect-specific session configurations (PostgreSQL statement timeout, etc.)
            if conn.engine.dialect.name == 'postgresql':
                 exec_conn.execute(text("SET statement_timeout = '30s'"))

            result = exec_conn.execute(text(final_sql))
            
            # Format rows and keys for the response
            if result.returns_rows:
                keys = list(result.keys())
                import datetime
                import decimal
                import uuid
                
                def serialize_val(val):
                    if isinstance(val, (datetime.datetime, datetime.date)):
                        return val.isoformat()
                    elif isinstance(val, decimal.Decimal):
                        return float(val)
                    elif isinstance(val, uuid.UUID):
                        return str(val)
                    return val
                    
                data = [{k: serialize_val(v) for k, v in zip(keys, row)} for row in result]
                return data, keys
            return [], []
                
        return self.service.run_dynamic_query(db_id, _op)

    # --- Private Helpers ---

    def _prepare_sql(self, sql: str, limit: int, dialect: str) -> str:
        """Modifies the SQL query to inject limits based on database dialect."""
        if sql.endswith(';'):
            sql = sql[:-1].strip()
            
        upper_sql = sql.upper()
        # Only inject LIMIT for SELECT statements that don't already have one
        if bool(re.match(r'^\s*SELECT\s', upper_sql)):
            if dialect == 'mssql' and not re.search(r'^\s*SELECT\s+TOP\s+\d+', upper_sql):
                return re.sub(r'(?i)^\s*SELECT\s+', f'SELECT TOP {limit} ', sql)
            elif dialect != 'mssql' and not re.search(r'\sLIMIT\s+\d+(\s+OFFSET\s+\d+)?\s*$', upper_sql):
                return f"{sql} LIMIT {limit}"
        return sql
