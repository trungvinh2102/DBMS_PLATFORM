"""
connection_service.py

Service for managing database connection configurations (CRUD) and connectivity testing.
"""

import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple

from services.base_service import BaseDatabaseService
from models.metadata import Db, SessionLocal, QueryHistory, SavedQuery
from utils.common import mask_config, encrypt_uri, decrypt_uri
from utils.crypto import encrypt, decrypt
from utils.connection_utils import ConnectionStringBuilder

logger = logging.getLogger(__name__)

class ConnectionService(BaseDatabaseService):
    """
    Manages database connection configurations and provides connectivity testing.
    """

    def list_databases(self) -> List[Dict[str, Any]]:
        """Lists all configured database connections with masked sensitive data."""
        session = SessionLocal()
        try:
            dbs = session.query(Db).order_by(Db.databaseName).all()
            return [self._format_db_response(db) for db in dbs]
        finally:
            session.close()

    def create_database(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new database connection configuration after a successful test."""
        session = SessionLocal()
        try:
            self._verify_connection(data)

            config = data['config'].copy()
            self._encrypt_sensitive_fields(config)
                 
            new_db = Db(
                id=str(uuid.uuid4()),
                databaseName=data['databaseName'],
                type=data['type'],
                environment=data.get('environment'),
                isReadOnly=data.get('isReadOnly', False),
                sslMode=data.get('sslMode'),
                sshConfig=data.get('sshConfig'),
                tags=data.get('tags'),
                config=config
            )
            session.add(new_db)
            session.commit()
            
            return {
                "id": new_db.id,
                "databaseName": new_db.databaseName,
                "config": mask_config(new_db.config)
            }
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def update_database(self, db_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Updates an existing database connection after a successful test."""
        session = SessionLocal()
        try:
            db = session.query(Db).filter(Db.id == db_id).first()
            if not db:
                raise Exception(f"Database with ID {db_id} not found")

            self._verify_connection_for_update(db, data)
            self._apply_updates(db, data)
            
            session.commit()
            self.invalidate_cache(db_id)
            
            return {"id": db.id, "config": mask_config(db.config)}
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def delete_database(self, db_id: str) -> bool:
        """Deletes a database connection and its associated history."""
        session = SessionLocal()
        try:
            # Delete dependent records first
            session.query(QueryHistory).filter(QueryHistory.databaseId == db_id).delete()
            session.query(SavedQuery).filter(SavedQuery.databaseId == db_id).delete()
            
            db = session.query(Db).filter(Db.id == db_id).first()
            if db:
                session.delete(db)
                session.commit()
                self.invalidate_cache(db_id)
                return True
            
            session.commit()
            return False
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def test_connection(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Tests connectivity to a database with the provided configuration."""
        try:
            db_type, config = self._prepare_test_config(data)
            if not config:
                return {"success": False, "message": "Missing configuration"}

            self._decrypt_test_config(config)

            if db_type == 'mongodb':
                return self._test_mongodb(config)
            
            if db_type == 'redis':
                return self._test_redis(config)
                
            return self._test_sqlalchemy(db_type, config)
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return {"success": False, "message": str(e)}

    # --- Private Helper Methods ---

    def _format_db_response(self, db: Db) -> Dict[str, Any]:
        """Formats a Db model instance into a dictionary for API response."""
        return {
            "id": db.id,
            "type": db.type,
            "databaseName": db.databaseName,
            "environment": db.environment.name if hasattr(db.environment, 'name') else db.environment,
            "isReadOnly": db.isReadOnly,
            "sslMode": db.sslMode.name if hasattr(db.sslMode, 'name') else db.sslMode,
            "config": mask_config(db.config)
        }

    def _verify_connection(self, data: Dict[str, Any]):
        """Runs a connection test and raises an exception if it fails."""
        test_result = self.test_connection(data)
        if not test_result['success']:
            raise Exception(f"Connection test failed: {test_result['message']}")

    def _verify_connection_for_update(self, db: Db, data: Dict[str, Any]):
        """Prepares a payload and verifies connection before updating."""
        payload = {
            'id': db.id,
            'type': data.get('type', db.type),
            'config': data.get('config')
        }
        self._verify_connection(payload)

    def _encrypt_sensitive_fields(self, config: Dict[str, Any]):
        """Encrypts password and URI fields in a configuration dictionary."""
        if config.get('password'):
            config['password'] = encrypt(config['password'])
        if config.get('uri'):
            config['uri'] = encrypt_uri(config['uri'])

    def _apply_updates(self, db: Db, data: Dict[str, Any]):
        """Applies data updates to a Db model instance."""
        if 'databaseName' in data: db.databaseName = data['databaseName']
        if 'environment' in data: db.environment = data['environment']
        if 'isReadOnly' in data: db.isReadOnly = data['isReadOnly']
        if 'sslMode' in data: db.sslMode = data['sslMode']
        if 'sshConfig' in data: db.sshConfig = data['sshConfig']
        
        if 'config' in data:
            new_config = data['config'].copy()
            # Preserve existing sensitive data if masked values are provided
            if new_config.get('password') == '********':
                new_config['password'] = db.config.get('password')
            elif new_config.get('password'):
                new_config['password'] = encrypt(new_config['password'])
            
            if new_config.get('uri') and '****' in new_config['uri']:
                new_config['uri'] = db.config.get('uri')
            elif new_config.get('uri'):
                new_config['uri'] = encrypt_uri(new_config['uri'])

            db.config = new_config

    def _prepare_test_config(self, data: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """Merges provided test data with existing configuration if an ID is present."""
        db_id = data.get('id')
        db_type = data.get('type', '').lower()
        config = data.get('config')

        if db_id:
            session = SessionLocal()
            try:
                exist_type, exist_config = self.get_db_config(db_id, session)
                db_type = db_type or exist_type
                if config:
                    merged = exist_config.copy()
                    # Handle sensitive data masks
                    if config.get('password') == "********":
                        config['password'] = exist_config.get('password')
                    
                    if config.get('uri') and '****' in config['uri']:
                        config['uri'] = exist_config.get('uri')
                        
                    merged.update(config)
                    config = merged
                else:
                    config = exist_config
            finally:
                session.close()
        elif not config:
            # Fallback: interpret fields directly from data
            config = {k: v for k, v in data.items() if k not in ('id', 'type')}
            
        return db_type, config

    def _decrypt_test_config(self, config: Dict[str, Any]):
        """Decrypts sensitive fields in the test configuration."""
        if config.get('password'):
            # Detect if it's already an encrypted string (prefix/format check)
            pwd = str(config['password'])
            if ':' in pwd and len(pwd.split(':')[0]) == 32:
                try:
                    config['password'] = decrypt(pwd)
                except Exception:
                    pass
        
        if config.get('uri'):
            config['uri'] = decrypt_uri(config['uri'])

    def _test_mongodb(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Tests direct connection to MongoDB."""
        from pymongo import MongoClient
        uri = config.get('uri')
        if uri:
            if 'authSource' not in uri:
                separator = '&' if '?' in uri else '?'
                uri = f"{uri}{separator}authSource=admin"
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        else:
            client = MongoClient(
                host=config.get('host', '127.0.0.1'),
                port=int(config.get('port', 27017)),
                username=config.get('user'),
                password=config.get('password'),
                authSource=config.get('authSource', 'admin'),
                replicaSet=config.get('replicaSet'),
                directConnection=config.get('directConnection', False),
                serverSelectionTimeoutMS=5000
            )
        client.admin.command('ping')
        return {"success": True, "message": "MongoDB connection successful"}

    def _test_redis(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Tests direct connection to Redis."""
        import redis
        uri = config.get('uri')
        if uri:
            client = redis.Redis.from_url(uri, socket_connect_timeout=5, decode_responses=True)
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
        client.ping()
        return {"success": True, "message": "Redis connection successful"}

    def _test_sqlalchemy(self, db_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Tests connection using SQLAlchemy engine creation logic."""
        engine = self.create_connection_engine(db_type, config)
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"success": True, "message": "Connection successful"}

connection_service = ConnectionService()
