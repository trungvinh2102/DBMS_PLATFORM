
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

# Add parent dir to path to import models if needed, though we use raw SQL here
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.metadata import DATABASE_URL

def migrate():
    if not DATABASE_URL:
        print("DATABASE_URL not set")
        return

    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Adding 'DATABASE' to ResourceType enum...")
        # Postgres allows adding value to enum
        try:
            conn.execute(text("ALTER TYPE \"ResourceType\" ADD VALUE IF NOT EXISTS 'DATABASE'"))
            print("Successfully added 'DATABASE' to ResourceType enum.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
