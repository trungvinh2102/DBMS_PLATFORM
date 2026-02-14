
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.metadata import DATABASE_URL

def check_and_fix():
    if not DATABASE_URL:
        print("DATABASE_URL not set")
        return

    # Use execution_options(isolation_level="AUTOCOMMIT") to ensure ALTER TYPE runs immediately
    engine = create_engine(DATABASE_URL, execution_options={"isolation_level": "AUTOCOMMIT"})
    
    with engine.connect() as conn:
        print("Checking enum values for 'ResourceType'...")
        try:
            # Query pg_enum to see existing values
            # The type name logic in SQLAlchemy might vary, usually it uses the name provided in Enum(name="...")
            # We defined name="ResourceType" in metadata.py
            
            # Find the OID of the enum
            result = conn.execute(text("SELECT oid, typname FROM pg_type WHERE typname = 'ResourceType'"))
            type_row = result.fetchone()
            
            if not type_row:
                print("Type 'ResourceType' not found. Trying lowercase 'resourcetype'...")
                result = conn.execute(text("SELECT oid, typname FROM pg_type WHERE typname = 'resourcetype'"))
                type_row = result.fetchone()
            
            if not type_row:
                print("Enum type not found in pg_type.")
                return

            type_oid = type_row[0]
            type_name = type_row[1]
            print(f"Found Enum Type: {type_name} (OID: {type_oid})")

            # List values
            result = conn.execute(text(f"SELECT enumlabel FROM pg_enum WHERE enumtypid = {type_oid}"))
            labels = [row[0] for row in result.fetchall()]
            print(f"Current labels: {labels}")

            if 'DATABASE' in labels:
                print("'DATABASE' is already in the enum.")
            else:
                print("Adding 'DATABASE' to enum...")
                # Note: We must be careful about quoting. If typname is ResourceType (case sensitive), we need quotes.
                # If it's resourcetype (all lower), usually no quotes or quotes match.
                
                sql_type_name = f'"{type_name}"' 
                conn.execute(text(f"ALTER TYPE {sql_type_name} ADD VALUE IF NOT EXISTS 'DATABASE'"))
                print("Executed ALTER TYPE.")
                
                # Verify again
                result = conn.execute(text(f"SELECT enumlabel FROM pg_enum WHERE enumtypid = {type_oid}"))
                new_labels = [row[0] for row in result.fetchall()]
                print(f"New labels: {new_labels}")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    check_and_fix()
