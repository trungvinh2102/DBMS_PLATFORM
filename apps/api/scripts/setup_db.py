import sys
import os

# Add backend root to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from models.metadata import Base, engine, DATABASE_URL
from sqlalchemy import create_engine, text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup():
    """
    Creates database and tables based on SQLAlchemy models.
    """
    if not DATABASE_URL:
        logger.error("No database url found. Check DATABASE_URL in .env")
        return
        
    # Connect to default `postgres` database to create the target db
    from urllib.parse import urlparse
    parsed = urlparse(DATABASE_URL)
    db_name = parsed.path.lstrip('/')
    
    default_url = DATABASE_URL.replace(f"/{db_name}", "/postgres")
    
    logger.info("Connecting to default database to check if target exists...")
    default_engine = create_engine(default_url, isolation_level="AUTOCOMMIT")
    try:
        with default_engine.connect() as conn:
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"))
            if not result.scalar():
                logger.info(f"Database '{db_name}' does not exist. Creating...")
                conn.execute(text(f"CREATE DATABASE {db_name}"))
            else:
                logger.info(f"Database '{db_name}' already exists.")
    except Exception as e:
        logger.error(f"Failed to create database: {e}")
        return
        
    logger.info(f"Creating database tables using engine: {engine.url}")
    try:
        # Create all tables defined in metadata.py
        Base.metadata.create_all(bind=engine)
        logger.info("Successfully created database tables.")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise

if __name__ == "__main__":
    setup()
