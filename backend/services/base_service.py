"""
backend/services/base_service.py

Base service for database operations providing shared functionality.
"""

from sqlalchemy.orm import Session
from models.metadata import Db, SessionLocal
from utils.common import decrypt_uri
from sqlalchemy import create_engine
import logging

logger = logging.getLogger(__name__)

class BaseDatabaseService:
    """
    Base class for services interacting with database configurations.
    """

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

    def create_connection_engine(self, db_type, config):
        """
        Creates an SQLAlchemy engine based on configuration.

        Args:
            db_type (str): The type of database (e.g., 'postgres').
            config (dict): The connection configuration.

        Returns:
            Engine: An SQLAlchemy engine instance.
        """
        if db_type != 'postgres':
            raise Exception(f"Database type '{db_type}' is not implemented yet.")
            
        conn_str = ""
        if config.get('uri'):
            conn_str = config['uri'].replace('localhost', '127.0.0.1')
            if conn_str.startswith('postgres://'):
                conn_str = conn_str.replace('postgres://', 'postgresql+psycopg2://')
            elif conn_str.startswith('postgresql://'):
                 conn_str = conn_str.replace('postgresql://', 'postgresql+psycopg2://')
        else:
            user = config.get('user')
            password = config.get('password')
            host = config.get('host', 'localhost')
            if host == 'localhost': host = '127.0.0.1'
            port = config.get('port', 5432)
            dbname = config.get('database')
            
            conn_str = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
            if config.get('ssl'):
                conn_str += "?sslmode=require"
                
        # Create engine
        # NullPool could be used for short-lived connections, 
        # but creating engine is expensive. Pooling is better generally.
        return create_engine(conn_str)

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
            engine = self.create_connection_engine(db_type, config)
            connection = engine.connect()
            return callback(connection)
        except Exception as e:
            logger.error(f"Error in dynamic query for {database_id}: {e}")
            raise e
        finally:
            if connection:
                connection.close()
            if engine:
                engine.dispose()
            session.close()
