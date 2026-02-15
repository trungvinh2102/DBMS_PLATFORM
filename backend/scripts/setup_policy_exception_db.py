"""
setup_policy_exception_db.py

Script to initialize the Policy Exception tables in the database.
"""
import sys
import os

# Add the parent directory to sys.path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
import os

# Load .env from backend directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from models.metadata import engine, Base
from models.policy_exception import PolicyException, ExceptionAudit

def setup_db():
    print("Creating Policy Exception tables...")
    try:
        # Create tables if they don't exist
        PolicyException.__table__.create(bind=engine, checkfirst=True)
        ExceptionAudit.__table__.create(bind=engine, checkfirst=True)
        print("Successfully created Policy Exception tables.")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    setup_db()
