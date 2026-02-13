"""
connection.py

Service for managing database connections (CRUD) and testing.
"""

from services.base_service import BaseDatabaseService
from models.metadata import Db
from utils.common import mask_config, encrypt_uri
from utils.crypto import encrypt
from utils.db_utils import with_session
import uuid
import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)

class ConnectionService(BaseDatabaseService):
    """
    Manages database connection configurations.
    """

    @with_session
    def list_databases(self, session):
        """
        Lists all configured database connections.
        """
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

    @with_session
    def create_database(self, session, data):
        """
        Creates a new database connection configuration.
        """
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
        
        return {
            "id": new_db.id,
            "databaseName": new_db.databaseName,
            "config": mask_config(new_db.config)
        }

    @with_session
    def update_database(self, session, db_id, data):
        """
        Updates an existing database connection.
        """
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

    @with_session
    def delete_database(self, session, db_id):
        """
        Deletes a database connection.
        """
        db = session.query(Db).filter(Db.id == db_id).first()
        if db:
            session.delete(db)
            session.commit()
            return True
        return False

    def test_connection(self, data):
        """
        Tests connectivity to a database without saving.
        """
        try:
            config = data.get('config')
            db_type = data.get('type')

            # Fetch existing if ID provided
            if data.get('id'):
                # Handle session locally for this specific test case
                from models.metadata import SessionLocal
                session = SessionLocal()
                try:
                    db = session.query(Db).filter(Db.id == data['id']).first()
                    if db:
                         db_type = db.type
                         config = db.config.copy()
                finally:
                    session.close()

            if not config:
                return {"success": False, "message": "Missing config"}

            engine = self.create_connection_engine(db_type, config)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            return {"success": True, "message": "Connection successful"}
        except Exception as e:
            return {"success": False, "message": str(e)}

connection_service = ConnectionService()

