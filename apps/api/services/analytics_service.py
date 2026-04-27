"""
analytics_service.py
High-performance analytical service powered by DuckDB.
Provides sub-second aggregations for the QurioDB Dashboard.
"""

import duckdb
import logging
import os
import pandas as pd
from models.metadata import engine, SessionLocal, QueryHistory
from sqlalchemy import select

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self):
        self.con = duckdb.connect(database=':memory:') # Or a dedicated file if needed
        self._initialized = False

    def sync_data(self):
        """
        Synchronizes historical query data from SQLite/Postgres to DuckDB.
        In a production app, this would be a background job or incremental sync.
        """
        try:
            # For this MVP, we'll pull the last 10,000 queries for analysis
            session = SessionLocal()
            try:
                # Use SQLAlchemy to get data efficiently
                query = session.query(QueryHistory).order_by(QueryHistory.executedAt.desc()).limit(10000)
                df = pd.read_sql(query.statement, session.bind)
                
                if df.empty:
                    logger.info("Analytics: No query history found for sync.")
                    return

                # Register the dataframe as a virtual table in DuckDB
                self.con.register('query_history', df)
                self._initialized = True
                logger.info(f"Analytics: Synchronized {len(df)} records to DuckDB.")
            finally:
                session.close()
        except Exception as e:
            logger.error(f"Analytics: Sync failed: {e}")

    def get_query_performance_trends(self):
        """
        Returns execution time trends aggregated by hour.
        """
        if not self._initialized:
            self.sync_data()

        if not self._initialized:
            return []

        try:
            # Vectorized aggregation using DuckDB SQL
            result = self.con.execute("""
                SELECT 
                    strftime(executedAt, '%H:00') as time,
                    AVG(executionTime) as avg_latency,
                    COUNT(*) as total_queries,
                    MAX(executionTime) as max_latency
                FROM query_history
                GROUP BY time
                ORDER BY time ASC
            """).fetchdf()
            
            return result.to_dict('records')
        except Exception as e:
            logger.error(f"Analytics: Performance trend query failed: {e}")
            return []

    def get_status_distribution(self):
        """
        Returns the distribution of success vs failure.
        """
        if not self._initialized:
            self.sync_data()

        if not self._initialized:
            return []

        try:
            result = self.con.execute("""
                SELECT status, COUNT(*) as count
                FROM query_history
                GROUP BY status
            """).fetchdf()
            return result.to_dict('records')
        except Exception as e:
            logger.error(f"Analytics: Status distribution query failed: {e}")
            return []

# Singleton instance
analytics_service = AnalyticsService()
