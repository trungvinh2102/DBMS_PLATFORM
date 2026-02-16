
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path to import models
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.metadata import Base, UserRole, AccessRequest, RequestStatus

# Load environment variables (simple way for this script)
DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/dbms_platform"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate():
    print("Running migration for AccessRequest and UserRole updates...")
    
    # 1. Add columns to user_roles table if they don't exist
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE user_roles ADD COLUMN valid_from TIMESTAMP"))
            print("Added valid_from column to user_roles")
        except Exception as e:
            print(f"valid_from column might already exist: {e}")
            
        try:
            conn.execute(text("ALTER TABLE user_roles ADD COLUMN valid_until TIMESTAMP"))
            print("Added valid_until column to user_roles")
        except Exception as e:
            print(f"valid_until column might already exist: {e}")

    # 2. Create access_requests table
    # We use SQLAlchemy's create_all which only creates tables that don't exist
    Base.metadata.create_all(engine)
    print("Created access_requests table (if not existed)")

if __name__ == "__main__":
    migrate()
