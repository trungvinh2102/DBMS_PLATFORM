"""
reset_policy_exception_db.py

Script to drop and recreate the Policy Exception tables.
"""
import sys
import os
from dotenv import load_dotenv

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from models.metadata import engine
from models.policy_exception import PolicyException, ExceptionAudit

def reset_db():
    print("Dropping Policy Exception tables...")
    try:
        ExceptionAudit.__table__.drop(bind=engine, checkfirst=True)
        PolicyException.__table__.drop(bind=engine, checkfirst=True)
        print("Creating Policy Exception tables...")
        PolicyException.__table__.create(bind=engine, checkfirst=True)
        ExceptionAudit.__table__.create(bind=engine, checkfirst=True)
        print("Successfully reset Policy Exception tables.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reset_db()
