"""
setup_sensitive_data_db.py

Script to initialize the Sensitive Data tables in the database.
"""
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the parent directory to sys.path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.metadata import engine, Base
from models.sensitive_data import SensitiveResource, SensitivePolicy

def init_db():
    print("Initializing Sensitive Data tables...")
    try:
        # Create all tables defined in models that inherit from Base
        # This will only create tables that don't exist yet
        Base.metadata.create_all(bind=engine)
        print("Successfully created Sensitive Data tables (if they didn't exist).")
    except Exception as e:
        print(f"Error initializing database: {e}")

if __name__ == "__main__":
    init_db()
