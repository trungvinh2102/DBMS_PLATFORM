"""
check_columns.py
"""
import sys
import os
from dotenv import load_dotenv
from sqlalchemy import inspect

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from models.metadata import engine

def check():
    inspector = inspect(engine)
    for table_name in ['policy_exceptions', 'exception_audits']:
        print(f"Columns for {table_name}:")
        columns = inspector.get_columns(table_name)
        for column in columns:
            print(f"  {column['name']} ({column['type']})")

if __name__ == "__main__":
    check()
