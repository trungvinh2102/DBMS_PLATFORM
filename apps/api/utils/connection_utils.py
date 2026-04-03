"""
connection_utils.py

Utilities for building and normalizing database connection strings.
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class ConnectionStringBuilder:
    """
    Handles the construction and normalization of connection strings for various database engines.
    """

    @staticmethod
    def get_mssql_driver() -> Optional[str]:
        """
        Detects the best available ODBC driver for MSSQL.
        """
        try:
            import pyodbc
            drivers = pyodbc.drivers()
            logger.info(f"Available ODBC drivers: {drivers}")
            for d in [
                "ODBC Driver 18 for SQL Server",
                "ODBC Driver 17 for SQL Server",
                "SQL Server"
            ]:
                if d in drivers:
                    return d
        except Exception as e:
            logger.error(f"ODBC driver detection failed: {e}")
        return None

    @staticmethod
    def build_uri(db_type: str, config: Dict[str, Any]) -> str:
        """
        Builds or normalizes a connection URI based on the database type and configuration.
        """
        db_type = db_type.lower()
        uri = config.get('uri', '').strip()

        # 1. Normalize existing URI if provided
        if uri:
            if (uri.startswith('"') and uri.endswith('"')) or (uri.startswith("'") and uri.endswith("'")):
                uri = uri[1:-1].strip()

            conn_str = uri.replace('localhost', '127.0.0.1')

            if conn_str.startswith('postgres://'):
                conn_str = conn_str.replace('postgres://', 'postgresql+psycopg2://')
            elif conn_str.startswith('postgresql://'):
                conn_str = conn_str.replace('postgresql://', 'postgresql+psycopg2://')
            elif conn_str.startswith('mysql://'):
                conn_str = conn_str.replace('mysql://', 'mysql+pymysql://')
            elif conn_str.startswith('mssql://') or conn_str.startswith('sqlserver://'):
                conn_str = conn_str.replace('sqlserver://', 'mssql+pyodbc://')
                conn_str = conn_str.replace('mssql://', 'mssql+pyodbc://')

                if "driver=" not in conn_str:
                    driver = (ConnectionStringBuilder.get_mssql_driver() or "ODBC Driver 17 for SQL Server").replace(" ", "+")
                    separator = "&" if "?" in conn_str else "?"
                    conn_str += f"{separator}driver={driver}&TrustServerCertificate=yes"
            elif conn_str.startswith('clickhouse://'):
                # Normalize legacy clickhouse scheme to clickhousedb for clickhouse-connect
                conn_str = conn_str.replace('clickhouse://', 'clickhousedb://')
            
            return conn_str

        # 2. Build URI from components
        from urllib.parse import quote_plus
        user = quote_plus(str(config.get('user', '')))
        password = quote_plus(str(config.get('password', '')))
        host = config.get('host', '127.0.0.1')
        port = config.get('port')
        dbname = config.get('database', '')

        if db_type == 'postgres':
            port = port or 5432
            return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"

        elif db_type == 'mysql':
            port = port or 3306
            return f"mysql+pymysql://{user}:{password}@{host}:{port}/{dbname}"

        elif db_type == 'mssql':
            port = port or 1433
            driver = (ConnectionStringBuilder.get_mssql_driver() or "ODBC Driver 17 for SQL Server").replace(" ", "+")
            return (
                f"mssql+pyodbc://{user}:{password}@{host}:{port}/{dbname}"
                f"?driver={driver}&TrustServerCertificate=yes"
            )

        elif db_type == 'sqlite':
            return f"sqlite:///{dbname}"

        elif db_type == 'duckdb':
            # DuckDB SQLAlchemy URI format: duckdb:///path/to/file.duckdb
            return f"duckdb:///{dbname}"

        elif db_type == 'clickhouse':
            protocol = config.get('protocol', 'http').lower()
            secure = config.get('secure', False)
            
            if protocol == 'native':
                # Use clickhouse-driver (Native protocol)
                default_port = 9440 if secure else 9000
                port = port or default_port
                scheme = "clickhouse+native"
                query_params = f"?secure=True" if secure else ""
                return f"{scheme}://{user}:{password}@{host}:{port}/{dbname}{query_params}"
            else:
                # Default to HTTP (clickhouse-connect)
                # 'clickhousedb' is the dialect name for the clickhouse-connect library
                default_port = 8443 if secure else 8123
                port = port or default_port
                scheme = "clickhousedb"
                query_params = f"?secure=True" if secure else ""
                return f"{scheme}://{user}:{password}@{host}:{port}/{dbname}{query_params}"

        elif db_type == 'redis':
            secure = config.get('secure', False)
            scheme = "rediss" if secure else "redis"
            db_index = config.get('database', '0')
            
            # Use username only if provided (Redis 6+ ACL)
            auth = f"{user}:{password}@" if user and password else f":{password}@" if password else ""
            return f"{scheme}://{auth}{host}:{port}/{db_index}"

        return ""
