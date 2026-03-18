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

class BaseDatabaseService:
    """
    Base class for services interacting with database configurations.
    """

    @staticmethod
    def invalidate_cache(db_id: str):
        """
        Invalidates cached engine/client for a specific database.
        """
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
                logger.info(f"Closed cached MongoClient for {db_id}")
            except Exception as e:
                logger.error(f"Failed to close MongoClient for {db_id}: {e}")

    def get_db_config(self, db_id: str, session: Session):
        """
        Retrieves and decrypts database configuration by ID.

        Args:
            db_id (str): The ID of the database configuration.
            session (Session): The SQLAlchemy session.

        Returns:
            tuple: (database_type, config_dict)
            
        Raises:
            Exception: If database ID is not found.
        """
        db = session.query(Db).filter(Db.id == db_id).first()
        if not db:
            raise Exception(f"Database connection with ID {db_id} not found")
        
        # Clone config to avoid modifying session object accidentally
        config = dict(db.config) if db.config else {}
        
        # specific decryption logic could be moved to utils if complex
        from utils.crypto import decrypt
        
        if config.get('password') and config['password'] != '********':
            try:
                config['password'] = decrypt(config['password'])
            except:
                pass
        
        if config.get('uri'):
            config['uri'] = decrypt_uri(config['uri'])
            
        return db.type, config

    def create_connection_engine(self, db_type, config, db_id=None):
        """
        Creates an SQLAlchemy engine based on configuration.

        Args:
            db_type (str): The type of database (e.g., 'postgres').
            config (dict): The connection configuration.
            db_id (str, optional): The database ID for caching.
        """
        # Caching logic
        if db_id and db_id in _engine_cache:
            return _engine_cache[db_id]

        if db_type not in ['postgres', 'mysql', 'mssql', 'sqlite', 'clickhouse']:
            raise Exception(f"Database type '{db_type}' is not currently supported.")
            
        conn_str = ""
        if config.get('uri'):
            uri = config['uri'].strip()
            # Remove literal quotes if present
            if (uri.startswith('"') and uri.endswith('"')) or (uri.startswith("'") and uri.endswith("'")):
                uri = uri[1:-1].strip()
                
            conn_str = uri.replace('localhost', '127.0.0.1')
            if conn_str.startswith('postgres://'):
                conn_str = conn_str.replace('postgres://', 'postgresql+psycopg2://')
            elif conn_str.startswith('postgresql://'):
                 conn_str = conn_str.replace('postgresql://', 'postgresql+psycopg2://')
        else:
            user = config.get('user')
            password = config.get('password')
            host = config.get('host', 'localhost')
            if host == 'localhost': host = '127.0.0.1'
            port = config.get('port')
            dbname = config.get('database', '')
            
            if db_type == 'postgres':
                port = port or 5432
                conn_str = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
                if config.get('ssl'):
                    conn_str += "?sslmode=require"
            elif db_type == 'mysql':
                port = port or 3306
                conn_str = f"mysql+pymysql://{user}:{password}@{host}:{port}/{dbname}"
            elif db_type == 'mssql':
                port = port or 1433
                conn_str = f"mssql+pyodbc://{user}:{password}@{host}:{port}/{dbname}?driver=ODBC+Driver+17+for+SQL+Server"
            elif db_type == 'sqlite':
                conn_str = f"sqlite:///{dbname}"
            elif db_type == 'clickhouse':
                port = port or 8123
                # clickhouse-connect SQLAlchemy dialect uses 'clickhousedb://'
                conn_str = f"clickhousedb://{user}:{password}@{host}:{port}/{dbname}"
                if config.get('ssl'):
                    conn_str += "?secure=True"

        # Masking for safe logging
        masked_conn_str = conn_str
        if '@' in conn_str:
            masked_conn_str = '***' + conn_str[conn_str.find('@'):]
        
        # Create engine with connection pooling and timeout
        connect_args = {}
            
        try:
            logger.info(f"Creating SQLAlchemy engine for: {masked_conn_str}")
            
            # Extract pooling parameters from config or use defaults
            pool_size = int(config.get('pool_size', 5))
            max_overflow = int(config.get('max_overflow', 10))
            pool_timeout = int(config.get('pool_timeout', 30))
            pool_recycle = int(config.get('pool_recycle', 1800))

            engine = create_engine(
                conn_str,
                poolclass=pool.QueuePool,
                pool_size=pool_size,
                max_overflow=max_overflow,
                pool_timeout=pool_timeout,
                pool_recycle=pool_recycle,
                connect_args=connect_args
            )
            
            if db_id:
                _engine_cache[db_id] = engine
            return engine
        except Exception as e:
            logger.error(f"SQLAlchemy engine creation FAILED for {masked_conn_str}: {e}")
            raise Exception(f"Failed to connect to {db_type} database. Check your configuration. (Error: {str(e)})")

    def run_dynamic_query(self, database_id: str, callback):
        """
        Executes a callback with an active database connection.

        Args:
            database_id (str): The target database ID.
            callback (function): Function accepting a connection object.

        Returns:
            Any: The result of the callback.
        """
        session = SessionLocal()
        engine = None
        connection = None
        try:
            db_type, config = self.get_db_config(database_id, session)
            engine = self.create_connection_engine(db_type, config, db_id=database_id)
            connection = engine.connect()
            return callback(connection)
        except Exception as e:
            logger.error(f"Error in dynamic query for {database_id}: {e}")
            raise e
        finally:
            if connection:
                connection.close()
            # Engine is cached, so do not dispose it here
            session.close()

    def get_mongo_client(self, database_id: str, session: Session):
        """
        Retrieves a cached MongoClient or creates a new one.
        Returns (client, default_database_name).
        """
        db_type, config = self.get_db_config(database_id, session)
        if db_type != 'mongodb':
            return None, None

        # Create a stable cache key
        if database_id in _mongo_cache:
            return _mongo_cache[database_id], config.get('database', 'test')

        host = config.get('host', '127.0.0.1')
        port = config.get('port', 27017)
        user = config.get('user', '')

        from pymongo import MongoClient
        try:
            # Extract pooling parameters from config
            pool_size = int(config.get('pool_size', 10))
            # pool_recycle translates roughly to maxIdleTimeMS in MongoDB
            max_idle_time_ms = int(config.get('pool_recycle', 1800)) * 1000
            
            client = MongoClient(
                host=host,
                port=int(port) if port else 27017,
                username=user,
                password=config.get('password'),
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                # Enable pooling
                maxPoolSize=pool_size,
                minPoolSize=1,
                maxIdleTimeMS=max_idle_time_ms
            )
            # Basic connectivity check
            client.admin.command('ping')
            _mongo_cache[database_id] = client
            return client, config.get('database', 'test')
        except Exception as e:
            logger.error(f"Failed to create MongoClient for {database_id}: {e}")
            return None, None
