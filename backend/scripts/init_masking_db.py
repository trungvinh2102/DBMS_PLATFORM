"""
init_masking_db.py

Script to initialize the masking policy table.
"""
import sys
import os

# Add 'backend' directory to path to allow imports like 'models.masking'
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

# Load environment variables FIRST
from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, '.env'))

# Now import models (which read env vars)
from models.metadata import engine, Base
from models.masking import MaskingRule, MaskingPattern

def init_db():
    print("Creating masking tables...")
    try:
        if engine is None:
            print("Error: Engine is None. DATABASE_URL might be missing or invalid.")
            return
            
        MaskingRule.__table__.create(bind=engine, checkfirst=True)
        print("MaskingRule table created/verified.")
        
        MaskingPattern.__table__.create(bind=engine, checkfirst=True)
        print("MaskingPattern table created/verified.")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db()
