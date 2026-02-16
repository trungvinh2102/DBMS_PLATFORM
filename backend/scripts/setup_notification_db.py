import sys
import os
from dotenv import load_dotenv

# Load env before imports that might use it
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.metadata import engine, Base
from models.notification import Notification

def setup_db():
    print("Creating notification table...")
    try:
        # Create tables
        Base.metadata.create_all(bind=engine)
        print("Success: Notification table created.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    setup_db()
