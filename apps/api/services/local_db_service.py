"""
local_db_service.py

Service for managing local/embedded databases (SQLite and DuckDB).
Provides connectivity and diagnostic tools for analysis.
"""

import logging
import duckdb
import sqlite3
import os
from typing import Dict, Any, List, Optional
from sqlalchemy import text, inspect

from services.base_service import BaseDatabaseService
from models.metadata import SessionLocal, Db

logger = logging.getLogger(__name__)

class LocalDbService(BaseDatabaseService):
    """
    Handles operations for file-based databases like SQLite and DuckDB.
    """

    def get_diagnostics(self, db_id: str, table_name: str) -> List[Dict[str, Any]]:
        """
        Retrieves statistical diagnostics for a table.
        Primarily leverages DuckDB's SUMMARIZE feature.
        """
        def _op(conn):
            db_type = conn.dialect.name
            
            if db_type == 'duckdb':
                # Use DuckDB's built-in SUMMARIZE command
                # This returns: column_name, column_type, min, max, approx_unique, avg, std, q25, q50, q75, count, null_percentage
                query = text(f"SUMMARIZE {table_name}")
                res = conn.execute(query)
                columns = [col for col in res.keys()]
                results = []
                for row in res:
                    results.append(dict(zip(columns, row)))
                return results
            
            elif db_type == 'sqlite':
                # SQLite doesn't have SUMMARIZE, so we build a basic profile
                # Fetch columns first
                inspector = inspect(conn)
                cols = inspector.get_columns(table_name)
                
                stats = []
                for col in cols:
                    name = col['name']
                    col_type = str(col['type']).upper()
                    
                    # Basic stats for numeric/text columns
                    try:
                        query = text(f"""
                            SELECT 
                                COUNT(*) as count,
                                SUM(CASE WHEN "{name}" IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as null_percentage,
                                COUNT(DISTINCT "{name}") as approx_unique
                            FROM "{table_name}"
                        """)
                        row = conn.execute(query).fetchone()
                        
                        stat = {
                            "column_name": name,
                            "column_type": col_type,
                            "count": row[0],
                            "null_percentage": row[1],
                            "approx_unique": row[2]
                        }
                        
                        # Add Min/Max for numeric types
                        if any(t in col_type for t in ['INT', 'FLOAT', 'REAL', 'NUMERIC', 'DOUBLE']):
                            mm_query = text(f'SELECT MIN("{name}"), MAX("{name}"), AVG("{name}") FROM "{table_name}"')
                            mm_row = conn.execute(mm_query).fetchone()
                            stat.update({
                                "min": mm_row[0],
                                "max": mm_row[1],
                                "avg": mm_row[2]
                            })
                            
                        stats.append(stat)
                    except Exception as e:
                        logger.warning(f"Could not get stats for column {name}: {e}")
                
                return stats
            
            return []

        return self.run_dynamic_query(db_id, _op)

    def validate_file_path(self, path: str) -> bool:
        """Verifies if the provided path is a valid existing file."""
        if not path:
            return False
        return os.path.exists(path) and os.path.isfile(path)

    def connect_external_file(self, path: str, db_type: str, name: Optional[str] = None) -> Dict[str, Any]:
        """
        Connects to an external file and registers it in the system metadata.
        """
        if not self.validate_file_path(path):
            raise Exception(f"File not found: {path}")

        db_type = db_type.lower()
        if db_type not in ['sqlite', 'duckdb']:
            raise Exception(f"Unsupported local database type: {db_type}")

        session = SessionLocal()
        try:
            import uuid
            db_id = str(uuid.uuid4())
            db_name = name or os.path.basename(path)
            
            # For SQLite/DuckDB, we store the absolute path in the 'database' field or config
            new_db = Db(
                id=db_id,
                databaseName=db_name,
                type=db_type,
                config={
                    "database": path,
                    "is_local_file": True
                }
            )
            
            # Test connection before saving
            engine = self.create_connection_engine(db_type, new_db.config)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            session.add(new_db)
            session.commit()
            
            return {
                "id": db_id,
                "name": db_name,
                "type": db_type,
                "path": path
            }
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to connect to local file {path}: {e}")
            raise e
        finally:
            session.close()

local_db_service = LocalDbService()
