"""
setup_data_access_db.py

Script to initialize the Data Access Control tables in the database.
"""
import sys
import os

# Add the parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from models.metadata import engine, Base
from models.data_access_models import DataResource, MaskingPolicy, DataAccessPolicy, DataAccessAudit

def init_db():
    print("Initializing Data Access Database Tables...")
    try:
        # Create all tables defined in data_access_models
        # SQLAlchemy's create_all will only create tables that don't exist
        Base.metadata.create_all(bind=engine)
        print("Successfully created/verified tables for:")
        print("- DataResource")
        print("- MaskingPolicy")
        print("- DataAccessPolicy")
        print("- DataAccessAudit")
        
    except Exception as e:
        print(f"Error initializing database: {e}")

if __name__ == "__main__":
    init_db()
