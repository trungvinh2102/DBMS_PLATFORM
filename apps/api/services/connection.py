"""
backend/services/connection.py

Service for managing databaseconnections (CRUD) and testing.
"""

from services.base_service import BaseDatabaseService
from models.metadata import Db, SessionLocal
from utils.common import mask_config, encrypt_uri
from utils.crypto import encrypt
import uuid
import logging

logger = logging.getLogger(__name__)

class ConnectionService(BaseDatabaseService):
    """
    Manages database connection configurations.
    """

    def list_databases(self):
        """
        Lists all configured database connections.

        Returns:
            list[dict]: A list of database configurations (masked).
        """
        session = SessionLocal()
        try:
            dbs = session.query(Db).order_by(Db.databaseName).all()
            result = []
            for db in dbs:
                data = {
                    "id": db.id,
                    "type": db.type,
                    "databaseName": db.databaseName,
                    "environment": db.environment.name if hasattr(db.environment, 'name') else db.environment,
                    "isReadOnly": db.isReadOnly,
                    "sslMode": db.sslMode.name if hasattr(db.sslMode, 'name') else db.sslMode,
                    "config": mask_config(db.config)
                }
                result.append(data)
            return result
        finally:
            session.close()

    def create_database(self, data):
        """
        Creates a new database connection configuration.

        Args:
            data (dict): The configuration data.

        Returns:
            dict: The created configuration (masked).
        """
        session = SessionLocal()
        try:
            # Enforce Test Connection before creation
            test_result = self.test_connection(data)
            if not test_result['success']:
                raise Exception(f"Connection test failed. Please verify your settings. Detail: {test_result['message']}")

            config = data['config'].copy()
            if config.get('password'):
                config['password'] = encrypt(config['password'])
            if config.get('uri'):
                 config['uri'] = encrypt_uri(config['uri'])
                 
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
            
            # Return with masked config
            # Create a simple dict representation
            result = {
                "id": new_db.id,
                "databaseName": new_db.databaseName,
                "config": mask_config(new_db.config)
            }
            return result
        finally:
            session.close()

    def update_database(self, db_id, data):
        """
        Updates an existing database connection.

        Args:
            db_id (str): The ID of the database to update.
            data (dict): The fields to update.

        Returns:
            dict: The updated configuration (masked).
        """
        session = SessionLocal()
        try:
            db = session.query(Db).filter(Db.id == db_id).first()
            if not db:
                raise Exception("Database not found")

            # Enforce Test Connection before update
            test_payload = {
                'id': db_id,
                'type': data.get('type', db.type),
                'config': data.get('config')
            }
            test_result = self.test_connection(test_payload)
            if not test_result['success']:
                raise Exception(f"Connection test failed. Update aborted. Detail: {test_result['message']}")

            # Update fields
            if 'databaseName' in data: db.databaseName = data['databaseName']
            if 'environment' in data: db.environment = data['environment']
            if 'isReadOnly' in data: db.isReadOnly = data['isReadOnly']
            if 'sslMode' in data: db.sslMode = data['sslMode']
            
            if 'config' in data:
                config = data['config'].copy()
                # If password is '********', keep old password
                if config.get('password') == '********':
                    if db.config.get('password'):
                        config['password'] = db.config['password']
                elif config.get('password'):
                    config['password'] = encrypt(config['password'])
                
                # If URI is masked, keep old URI
                if config.get('uri') and '****' in config['uri']:
                    if db.config.get('uri'):
                       config['uri'] = db.config['uri']
                elif config.get('uri'):
                    config['uri'] = encrypt_uri(config['uri'])

                db.config = config

            session.commit()
            
            # Invalidate cache so next request uses new config
            self.invalidate_cache(db_id)
            
            return {"id": db.id, "config": mask_config(db.config)}
        finally:
            session.close()

    def delete_database(self, db_id):
        """
        Deletes a database connection and its associated history.

        Args:
            db_id (str): The ID of the database to delete.
            
        Returns:
            bool: True if deleted successfully.
        """
        from models.metadata import QueryHistory, SavedQuery
        session = SessionLocal()
        try:
            # 1. First delete any history or saved queries referencing this database
            # to avoid ForeignKeyViolation errors.
            session.query(QueryHistory).filter(QueryHistory.databaseId == db_id).delete()
            session.query(SavedQuery).filter(SavedQuery.databaseId == db_id).delete()
            
            # 2. Then delete the database record
            db = session.query(Db).filter(Db.id == db_id).first()
            if db:
                session.delete(db)
                session.commit()
                # Invalidate cache
                self.invalidate_cache(db_id)
                return True
            session.commit() # Commit deletion of history even if db record is missing
            return False
        finally:
            session.close()

    def test_connection(self, data):
        """
        Tests connectivity to a database without saving.

        Args:
            data (dict): Connection parameters (id, type, and either config or direct connection fields).
            
        Returns:
            dict: {success: bool, message: str}
        """
        try:
            config = data.get('config')
            db_type = data.get('type').lower() if data.get('type') else None

            # Fetch existing if ID provided (to merge with fields not provided in test)
            if data.get('id'):
                session = SessionLocal()
                try:
                    existing_db_type, existing_config = self.get_db_config(data['id'], session)
                    # If type not explicitly provided in test, use existing
                    if not db_type:
                        db_type = existing_db_type
                    # Merge config: test config overrides existing config
                    if config:
                        merged_config = existing_config.copy()
                        merged_config.update(config)
                        config = merged_config
                    else:
                        config = existing_config
                finally:
                    session.close()
            else:
                if not config:
                    # If config is missing, assume the fields are directly in data
                    config = {k: v for k, v in data.items() if k not in ('id', 'type')}

            if not config:
                return {"success": False, "message": "Missing config"}

            # Support encrypted password and URI in the raw config sent for testing
            from utils.crypto import decrypt
            from utils.common import decrypt_uri
            
            if config.get('password') and ':' in str(config['password']) and len(str(config['password']).split(':')[0]) == 32:
                 try:
                     config['password'] = decrypt(config['password'])
                 except:
                     pass
                     
            if config.get('uri'):
                 config['uri'] = decrypt_uri(config['uri'])

            if db_type == 'mongodb':
                # For MongoDB, we use pymongo directly for both health checks and queries
                from pymongo import MongoClient
                
                # Check for URI first
                uri = config.get('uri')
                if uri:
                    # Fix for MongoDB authentication: Ensure authSource=admin is present
                    # if not explicitly specified, to support root user authentication.
                    if 'authSource' not in uri:
                        separator = '&' if '?' in uri else '?'
                        uri = f"{uri}{separator}authSource=admin"
                    
                    client = MongoClient(uri, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000)
                else:
                    host = config.get('host', '127.0.0.1')
                    try:
                        port = int(config.get('port', 27017))
                    except (ValueError, TypeError):
                        port = 27017
                    user = config.get('user')
                    password = config.get('password')
                    auth_source = config.get('authSource', 'admin')
                    
                    print(f"DEBUG: Testing MongoDB with user={user}, authSource={auth_source}, host={host}:{port}")
                    
                    client = MongoClient(
                        host=host,
                        port=port,
                        username=user,
                        password=password,
                        authSource=auth_source,
                        serverSelectionTimeoutMS=5000,
                        connectTimeoutMS=5000
                    )
                client.admin.command('ping')
                return {"success": True, "message": "Connection successful (Direct MongoDB)"}
            
            if db_type == 'redis':
                import redis
                
                # Check for URI first
                uri = config.get('uri')
                if uri:
                    client = redis.Redis.from_url(
                        uri, 
                        socket_connect_timeout=5, 
                        decode_responses=True
                    )
                else:
                    host = config.get('host', '127.0.0.1')
                    try:
                        port = int(config.get('port', 6379))
                    except (ValueError, TypeError):
                        port = 6379
                    
                    username = config.get('user', '')
                    password = config.get('password')
                    
                    try:
                        db_index = int(config.get('database', 0))
                    except (ValueError, TypeError):
                        db_index = 0
                    
                    client = redis.Redis(
                        host=host,
                        port=port,
                        username=username if username else None,
                        password=password if password else None,
                        db=db_index,
                        socket_connect_timeout=5,
                        decode_responses=True
                    )
                client.ping()
                return {"success": True, "message": "Connection successful (Direct Redis)"}
                
            engine = self.create_connection_engine(db_type, config)
            with engine.connect() as conn:
                from sqlalchemy import text
                conn.execute(text("SELECT 1"))
            
            return {"success": True, "message": "Connection successful"}
        except Exception as e:
            return {"success": False, "message": str(e)}

connection_service = ConnectionService()
