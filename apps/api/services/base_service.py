"""
backend/services/base_service.py

Base service for database operations providing shared functionality.
"""

from sqlalchemy.orm import Session
from models.metadata import Db, SessionLocal
from utils.common import decrypt_uri
from sqlalchemy import create_engine, pool
import logging

logger = logging.getLogger(__name__)

# Cache for database engines to manage connection pooling globally
_engine_cache = {} # Map db_id -> engine
_mongo_cache = {}  # Map db_id -> client
_redis_cache = {}  # Map db_id -> client

class BaseDatabaseService:
    """
    Base class for services interacting with database configurations.
    """

    @staticmethod
    def invalidate_cache(db_id: str):
        if db_id in _engine_cache:
            engine = _engine_cache.pop(db_id)
            try:
                engine.dispose()
                logger.info(f"Disposed cached SQLAlchemy engine for {db_id}")
            except Exception as e:
                logger.error(f"Failed to dispose engine for {db_id}: {e}")
        
        if db_id in _mongo_cache:
            client = _mongo_cache.pop(db_id)
            try:
                client.close()
            except Exception as e:
                logger.error(e)

        if db_id in _redis_cache:
            client = _redis_cache.pop(db_id)
            try:
                client.close()
            except Exception as e:
                logger.error(e)

    def get_db_config(self, db_id: str, session: Session):
        db = session.query(Db).filter(Db.id == db_id).first()
        if not db:
            raise Exception(f"Database connection with ID {db_id} not found")
        
        config = dict(db.config) if db.config else {}
        
        from utils.crypto import decrypt
        
        if config.get('password') and config['password'] != '********':
            try:
                config['password'] = decrypt(config['password'])
            except:
                pass
        
        if config.get('uri'):
            config['uri'] = decrypt_uri(config['uri'])
            
        return db.type.lower() if db.type else "unknown", config

    def create_connection_engine(self, db_type, config, db_id=None):
        if db_id and db_id in _engine_cache:
            return _engine_cache[db_id]

        db_type = db_type.lower() if db_type else ""
        if db_type == 'sqlserver':
            db_type = 'mssql'

        if db_type in ['redis', 'mongodb']:
            return None

        if db_type not in ['postgres', 'mysql', 'mssql', 'sqlite', 'clickhouse']:
            raise Exception(f"Database type '{db_type}' is not supported.")

        mssql_driver = None
        if db_type == 'mssql':
            try:
                import pyodbc
                print('pyodbc.drivers() ', pyodbc.drivers())
                drivers = pyodbc.drivers()
                logger.info(f"Available ODBC drivers: {drivers}")
                for d in [
                    "ODBC Driver 18 for SQL Server",
                    "ODBC Driver 17 for SQL Server",
                    "SQL Server"
                ]:
                    if d in drivers:
                        mssql_driver = d
                        break
                logger.info(f"Using MSSQL driver: {mssql_driver}")
            except Exception as e:
                logger.error(f"ODBC driver detection failed: {e}")

        conn_str = ""

        # ✅ HANDLE URI
        if config.get('uri'):
            uri = config['uri'].strip()

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
                    driver = (mssql_driver or "ODBC Driver 17 for SQL Server").replace(" ", "+")
                    separator = "&" if "?" in conn_str else "?"
                    conn_str += f"{separator}driver={driver}&TrustServerCertificate=yes"

        else:
            user = config.get('user')
            password = config.get('password')
            host = config.get('host', '127.0.0.1')
            port = config.get('port')
            dbname = config.get('database', '')

            if db_type == 'postgres':
                port = port or 5432
                conn_str = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"

            elif db_type == 'mysql':
                port = port or 3306
                conn_str = f"mysql+pymysql://{user}:{password}@{host}:{port}/{dbname}"

            elif db_type == 'mssql':
                port = port or 1433
                driver = (mssql_driver or "ODBC Driver 17 for SQL Server").replace(" ", "+")

                conn_str = (
                    f"mssql+pyodbc://{user}:{password}@{host}:{port}/{dbname}"
                    f"?driver={driver}&TrustServerCertificate=yes"
                )

            elif db_type == 'sqlite':
                conn_str = f"sqlite:///{dbname}"

            elif db_type == 'clickhouse':
                port = port or 8123
                conn_str = f"clickhousedb://{user}:{password}@{host}:{port}/{dbname}"

        # Mask log
        masked_conn_str = '***' + conn_str.split('@')[-1] if '@' in conn_str else conn_str
        logger.info(f"Connecting with: {masked_conn_str}")

        try:
            engine = create_engine(
                conn_str,
                poolclass=pool.QueuePool,
                pool_size=int(config.get('pool_size', 5)),
                max_overflow=int(config.get('max_overflow', 10)),
                pool_timeout=int(config.get('pool_timeout', 30)),
                pool_recycle=int(config.get('pool_recycle', 1800)),
            )

            if db_id:
                _engine_cache[db_id] = engine

            return engine

        except Exception as e:
            logger.error(f"Connection FAILED: {e}")
            raise Exception(f"Failed to connect to {db_type}: {str(e)}")

    def run_dynamic_query(self, database_id: str, callback):
        session = SessionLocal()
        connection = None
        try:
            db_type, config = self.get_db_config(database_id, session)
            engine = self.create_connection_engine(db_type, config, db_id=database_id)

            if not engine:
                raise Exception(f"{db_type} does not support SQL queries")

            connection = engine.connect()
            return callback(connection)

        except Exception as e:
            logger.error(f"Query error: {e}")
            raise e

        finally:
            if connection:
                connection.close()
            session.close()