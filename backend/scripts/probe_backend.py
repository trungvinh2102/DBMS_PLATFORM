"""
probe_backend.py

Probes the backend to see if Policy Exception service works.
"""
import sys
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from services.policy_exception_service import policy_exception_service
from models.metadata import SessionLocal

def probe():
    print("Testing Policy Exception Service...")
    session = SessionLocal()
    try:
        # Test List
        print("Testing list_exceptions...")
        exceptions = policy_exception_service.list_exceptions()
        print(f"  Found {len(exceptions)} exceptions.")

        # Test Create
        print("Testing create_exception...")
        data = {
            "subjectType": "USER",
            "subjectId": "test-user",
            "overridePrivilege": "READ_RAW",
            "scope": "TABLE",
            "purpose": "Test probe",
            "startTime": "2026-02-14T12:00:00.000Z",
            "endTime": "2026-02-14T16:00:00.000Z",
            "riskLevel": "LOW"
        }
        new_exc = policy_exception_service.create_exception(data, "admin-id")
        print(f"  Created exception: {new_exc['id']}")

    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    probe()
