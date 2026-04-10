import pandas as pd
import logging
from .base import BulkLoader

logger = logging.getLogger(__name__)

class SQLAlchemyLoader(BulkLoader):
    def load(self, connection, table_name: str, schema_name: str, df: pd.DataFrame, mapping: dict = None):
        """
        Generic loader using pandas to_sql.
        Works for SQLite, MySQL, DuckDB, etc.
        Note: connection here might be a raw connection or an engine. 
        pandas.to_sql expects an engine or a connection object that SQLAlchemy understands.
        """
        df = self._get_mapped_df(df, mapping)
        
        try:
            # For to_sql, if we have a raw connection, it might not work directly.
            # But in SQLLab we usually have an engine.
            # Wait, ImportService.py passes raw_conn = engine.raw_connection()
            
            # pandas.to_sql can take a database connection
            # If it's a raw psycopg2/sqlite3 connection, to_sql handles it.
            df.to_sql(
                name=table_name,
                con=connection,
                schema=schema_name,
                if_exists='append',
                index=False,
                method='multi' # Better performance for some DBs
            )
            
            logger.info(f"Successfully loaded {len(df)} rows into {table_name}")
            return True, len(df)
        except Exception as e:
            logger.error(f"SQLAlchemy bulk load failed: {str(e)}")
            raise e

    def validate_schema(self, connection, table_name: str, schema_name: str, df_columns: list):
        pass
