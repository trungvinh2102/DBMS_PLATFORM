import os
import uuid
import pandas as pd
import logging
from typing import Dict, Any, List, Optional
from services.connection import ConnectionService
from services.loaders.postgres_loader import PostgresLoader
from services.loaders.sqlalchemy_loader import SQLAlchemyLoader
from models.metadata import Db, SessionLocal

logger = logging.getLogger(__name__)

class ImportService:
    def __init__(self):
        self.connection_service = ConnectionService()
        self.loaders = {
            'postgresql': PostgresLoader(),
            'sqlite': SQLAlchemyLoader(),
            'duckdb': SQLAlchemyLoader(),
            'mysql': SQLAlchemyLoader(),
            'mariadb': SQLAlchemyLoader(),
            'mssql': SQLAlchemyLoader(),
            'oracle': SQLAlchemyLoader(),
            'clickhouse': SQLAlchemyLoader(),
        }
        # In-memory job tracking (should be moved to Redis for production)
        self.jobs = {}

    def start_import(self, database_id: str, table_name: str, schema_name: str, 
                     file_path: str, format: str, mapping: dict = None):
        """
        Main entry point for starting an import job.
        Starts a background thread to handle the import.
        """
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {
            "id": job_id,
            "status": "pending",
            "progress": 0,
            "total_rows": 0,
            "error": None
        }

        # Start background thread
        import threading
        thread = threading.Thread(
            target=self._run_import_task,
            args=(job_id, database_id, table_name, schema_name, file_path, format, mapping)
        )
        thread.daemon = True
        thread.start()

        return {"job_id": job_id, "status": "pending"}

    def _run_import_task(self, job_id: str, database_id: str, table_name: str, 
                         schema_name: str, file_path: str, format: str, mapping: dict = None):
        """Background task for importing data."""
        try:
            # 1. Get database configuration
            session = SessionLocal()
            try:
                db = session.query(Db).filter(Db.id == database_id).first()
                if not db:
                    raise Exception(f"Database {database_id} not found")
                
                db_type = db.type.lower()
            finally:
                session.close()

            loader = self.loaders.get(db_type)
            if not loader:
                raise Exception(f"Bulk loading not supported for {db_type} yet")

            # 2. Load data into memory
            self.jobs[job_id]["status"] = "parsing"
            self.jobs[job_id]["progress"] = 10
            
            df = self._parse_file(file_path, format)
            self.jobs[job_id]["total_rows"] = len(df)
            self.jobs[job_id]["progress"] = 40
            self.jobs[job_id]["status"] = "loading"

            # 3. Get connection for bulk loading
            engine = self.connection_service.get_engine(database_id)
            
            # 4. Execute bulk load
            if db_type == 'postgresql':
                # PostgresLoader prefers raw connection for COPY command
                raw_conn = engine.raw_connection()
                try:
                    loader.load(raw_conn, table_name, schema_name, df, mapping)
                finally:
                    raw_conn.close()
            else:
                # SQLAlchemyLoader (pandas.to_sql) works best with engine or connection
                loader.load(engine, table_name, schema_name, df, mapping)
            
            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 100

        except Exception as e:
            logger.error(f"Import failed: {str(e)}")
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)
            self.jobs[job_id]["progress"] = 0
        finally:
            # Clean up the temp file
            if os.path.exists(file_path):
                os.remove(file_path)

    def get_job_status(self, job_id: str):
        return self.jobs.get(job_id)

    def _parse_file(self, file_path: str, format: str) -> pd.DataFrame:
        """Parses various file formats into a pandas DataFrame."""
        if format == 'csv':
            return pd.read_csv(file_path)
        elif format == 'json':
            return pd.read_json(file_path)
        elif format == 'parquet':
            return pd.read_parquet(file_path)
        elif format == 'excel':
            return pd.read_excel(file_path)
        else:
            raise Exception(f"Unsupported format: {format}")

import_service = ImportService()
