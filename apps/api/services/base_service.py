"""
base_service.py

Base service for database operations providing shared functionality like connection management.
"""

from typing import Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, pool
import logging

from models.metadata import Db, SessionLocal
from utils.common import decrypt_uri
from utils.connection_utils import ConnectionStringBuilder

logger = logging.getLogger(__name__)

# Cache for database engines to manage connection pooling globally
_engine_cache = {} # Map db_id -> engine
_mongo_cache = {}  # Map db_id -> client
_redis_cache = {}  # Map db_id -> client

class BaseDatabaseService:
    """
    Base class for services interacting with database configurations.
    Provides shared methods for config retrieval, caching, and engine creation.
    """

    @staticmethod
    def invalidate_cache(db_id: str):
        """Removes and disposes cached connections for a specific database."""
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
                logger.error(f"Failed to close Mongo client for {db_id}: {e}")

        if db_id in _redis_cache:
            client = _redis_cache.pop(db_id)
            try:
                client.close()
            except Exception as e:
                logger.error(f"Failed to close Redis client for {db_id}: {e}")

    def get_db_config(self, db_id: str, session: Session) -> Tuple[str, Dict[str, Any]]:
        """Retrieves and decrypts database configuration."""
        db = session.query(Db).filter(Db.id == db_id).first()
        if not db:
            raise Exception(f"Database connection with ID {db_id} not found")
        
        config = dict(db.config) if db.config else {}
        
        from utils.crypto import decrypt
        
        if config.get('password') and config['password'] != '********':
            try:
                config['password'] = decrypt(config['password'])
            except Exception as e:
                logger.debug(f"Password decryption skipped: {e}")
        
        if config.get('uri'):
            config['uri'] = decrypt_uri(config['uri'])
            
        return db.type.lower() if db.type else "unknown", config

    def create_connection_engine(self, db_type: str, config: Dict[str, Any], db_id: Optional[str] = None):
        """
        Creates a SQLAlchemy engine for the given configuration.
        Uses caching if db_id is provided.
        """
        if db_id and db_id in _engine_cache:
            return _engine_cache[db_id]

        db_type = db_type.lower() if db_type else ""
        if db_type == 'sqlserver':
            db_type = 'mssql'

        if db_type in ['redis', 'mongodb']:
            return None

        if db_type not in ['postgres', 'mysql', 'mssql', 'sqlite', 'clickhouse', 'duckdb']:
            raise Exception(f"Database type '{db_type}' is not supported via SQLAlchemy.")

        conn_str = ConnectionStringBuilder.build_uri(db_type, config)
        
        # Mask credentials in logs
        masked_conn_str = '***' + conn_str.split('@')[-1] if '@' in conn_str else conn_str
        logger.info(f"Connecting to {db_type} with: {masked_conn_str}")

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

    def get_mongo_client(self, db_id: str, session: Session):
        """Acquires a cached or new pymongo MongoClient."""
        if db_id in _mongo_cache:
            client = _mongo_cache[db_id]
            # Verify connection is still alive
            try:
                client.admin.command('ping')
                return client, _mongo_cache.get(f"{db_id}_db", "test")
            except:
                self.invalidate_cache(db_id)

        from pymongo import MongoClient
        _, config = self.get_db_config(db_id, session)
        
        uri = config.get('uri')
        if uri:
            if 'authSource' not in uri:
                separator = '&' if '?' in uri else '?'
                uri = f"{uri}{separator}authSource=admin"
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            default_db = config.get('database', 'test')
        else:
            client = MongoClient(
                host=config.get('host', '127.0.0.1'),
                port=int(config.get('port', 27017)),
                username=config.get('user'),
                password=config.get('password'),
                authSource=config.get('authSource', 'admin'),
                serverSelectionTimeoutMS=5000
            )
            default_db = config.get('database', 'test')
        
        _mongo_cache[db_id] = client
        _mongo_cache[f"{db_id}_db"] = default_db
        return client, default_db

    def get_redis_client(self, db_id: str, session: Session):
        """Acquires a cached or new redis-py client."""
        if db_id in _redis_cache:
            client = _redis_cache[db_id]
            try:
                client.ping()
                return client, _redis_cache.get(f"{db_id}_db", 0)
            except:
                self.invalidate_cache(db_id)

        import redis
        _, config = self.get_db_config(db_id, session)
        
        uri = config.get('uri')
        if uri:
            client = redis.Redis.from_url(uri, socket_connect_timeout=5, decode_responses=True)
            default_db = 0 # Extracted from URI? Usually encoded in path
        else:
            client = redis.Redis(
                host=config.get('host', '127.0.0.1'),
                port=int(config.get('port', 6379)),
                username=config.get('user'),
                password=config.get('password'),
                db=int(config.get('database', 0)),
                socket_connect_timeout=5,
                decode_responses=True
            )
            default_db = int(config.get('database', 0))
            
        _redis_cache[db_id] = client
        _redis_cache[f"{db_id}_db"] = default_db
        return client, default_db

    def run_dynamic_query(self, database_id: str, callback):
        """Helper to run a callback function using a database connection."""
        session = SessionLocal()
        connection = None
        try:
            db_type, config = self.get_db_config(database_id, session)
            engine = self.create_connection_engine(db_type, config, db_id=database_id)

            if not engine:
                raise Exception(f"{db_type} does not support standard SQL queries via SQLAlchemy.")

            connection = engine.connect()
            return callback(connection)

        except Exception as e:
            logger.error(f"Query execution error for {database_id}: {e}")
            raise e

        finally:
            if connection:
                connection.close()
            session.close()