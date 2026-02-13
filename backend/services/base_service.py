"""
base_service.py

Base service for database operations providing shared functionality.
"""

from sqlalchemy.orm import Session
from models.metadata import Db, SessionLocal, UserSetting
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

    def _get_user_settings(self):
        """
        Helper to fetch current user's settings if available in Flask context.
        """
        try:
            from flask import g
            if hasattr(g, 'user') and g.user.get('userId'):
                session = SessionLocal()
                try:
                    setting = session.query(UserSetting).filter(UserSetting.userId == g.user['userId']).first()
                    return setting.settings if setting else {}
                finally:
                    session.close()
        except ImportError:
            pass  # Not in Flask context
        except Exception as e:
            logger.warning(f"Failed to fetch user settings: {e}")
        return {}

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
            
        # Fetch global defaults
        user_settings = self._get_user_settings()
        conn_defaults = user_settings.get('connectionDefaults', {})
        sec_defaults = user_settings.get('securityDefaults', {})

        # Default values fallback
        timeout = conn_defaults.get('timeout', 10)
        keep_alive = conn_defaults.get('keepAliveInterval', 60)
        max_pool_size = conn_defaults.get('maxPoolSize', 10)
        
        ssl_mode = sec_defaults.get('sslMode', 'prefer')
        enforce_ssl = sec_defaults.get('enforceSSL', False)
        
        if enforce_ssl and ssl_mode == 'disable':
            ssl_mode = 'require'

        conn_str = ""
        connect_args = {
            "connect_timeout": timeout,
            "keepalives": 1,
            "keepalives_idle": keep_alive
        }

        if config.get('uri'):
            conn_str = config['uri'].replace('localhost', '127.0.0.1')
            if conn_str.startswith('postgres://'):
                conn_str = conn_str.replace('postgres://', 'postgresql+psycopg2://')
            elif conn_str.startswith('postgresql://'):
                 conn_str = conn_str.replace('postgresql://', 'postgresql+psycopg2://')
            
            # Append SSL mode if not present in URI, or override?
            # URI usually takes precedence, but we can append args if needed.
            # However, SQLAlchemy handles connect_args separately.
            
        else:
            user = config.get('user')
            password = config.get('password')
            host = config.get('host', 'localhost')
            if host == 'localhost': host = '127.0.0.1'
            port = config.get('port', 5432)
            dbname = config.get('database')
            
            conn_str = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
            
            # Apply SSL mode
            # Postgres support: disable, allow, prefer, require, verify-ca, verify-full
            # If config has specific ssl setting, use it, otherwise use default
            if config.get('ssl'):
                 connect_args['sslmode'] = 'require'
            elif ssl_mode != 'disable':
                 connect_args['sslmode'] = ssl_mode
                
        # Create engine with pool settings
        return create_engine(
            conn_str,
            pool_size=max_pool_size,
            max_overflow=max_pool_size + 5, # Allow some overflow
            connect_args=connect_args
        )

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
