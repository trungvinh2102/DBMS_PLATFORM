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
            return {"id": db.id, "config": mask_config(db.config)}
        finally:
            session.close()

    def delete_database(self, db_id):
        """
        Deletes a database connection.

        Args:
            db_id (str): The ID of the database to delete.
            
        Returns:
            bool: True if deleted successfully.
        """
        session = SessionLocal()
        try:
            db = session.query(Db).filter(Db.id == db_id).first()
            if db:
                session.delete(db)
                session.commit()
                return True
            return False
        finally:
            session.close()

    def test_connection(self, data):
        """
        Tests connectivity to a database without saving.

        Args:
            data (dict): Connection parameters (id, type, config).
            
        Returns:
            dict: {success: bool, message: str}
        """
        try:
            config = data.get('config')
            db_type = data.get('type')

            # Fetch existing if ID provided
            if data.get('id'):
                # We can reuse get_db_config logic but need session management localized
                # Or create a minimal session here
                session = SessionLocal()
                # ... get config logic ...
                # Reusing existing method might be tricky if it requires session as arg
                # Refactor base class if time permits, for now localized:
                db = session.query(Db).filter(Db.id == data['id']).first()
                if db:
                     # Decrypt logic duplication - ideally in util
                     db_type = db.type
                     config = db.config.copy()
                     # ... decryption ... (simplified for now assuming provided config is raw/user input usually on test)
                session.close()

            if not config:
                return {"success": False, "message": "Missing config"}

            engine = self.create_connection_engine(db_type, config)
            with engine.connect() as conn:
                from sqlalchemy import text
                conn.execute(text("SELECT 1"))
            
            return {"success": True, "message": "Connection successful"}
        except Exception as e:
            return {"success": False, "message": str(e)}

connection_service = ConnectionService()
