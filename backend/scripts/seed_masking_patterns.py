"""
seed_masking_patterns.py

Seed the database with default Masking Patterns (Enterprise Standards).
"""

import sys
import os

# Add 'backend' directory to path to allow imports like 'models.masking'
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, '.env'))

from models.metadata import engine, SessionLocal
from models.masking import MaskingPattern, MaskingRuleType

def seed_patterns():
    db = SessionLocal()
    try:
        patterns = [
            {
                "name": "Full Masking",
                "description": "Completely hide the data",
                "maskingType": MaskingRuleType.FULL,
                "maskingArgs": None,
            },
            {
                "name": "Partial Masking (Email)",
                "description": "Show only domain part of email",
                "maskingType": MaskingRuleType.EMAIL,
                "maskingArgs": None,
            },
            {
                "name": "Partial Masking (Credit Card)",
                "description": "Show only last 4 digits",
                "maskingType": MaskingRuleType.PARTIAL,
                "maskingArgs": '{"start": 0, "end": 4, "mask": "************"}',
            },
            {
                "name": "Partial Masking (US Phone)",
                "description": "Show only last 4 digits (XXX-XXX-1234)",
                "maskingType": MaskingRuleType.PARTIAL,
                "maskingArgs": '{"start": 0, "end": 4, "mask": "***-***-"}',
            },
            {
                "name": "Initial Masking",
                "description": "Show only first character",
                "maskingType": MaskingRuleType.PARTIAL,
                "maskingArgs": '{"start": 1, "end": 0, "mask": "*****"}',
            },
            {
                "name": "Nullify",
                "description": "Return NULL for sensitive data",
                "maskingType": MaskingRuleType.NULL,
                "maskingArgs": None,
            },
            {
                "name": "Hashing",
                "description": "One-way hash (MD5) for analytics",
                "maskingType": MaskingRuleType.HASH,
                "maskingArgs": None,
            }
        ]

        print("Seeding masking patterns...")
        for p_data in patterns:
            existing = db.query(MaskingPattern).filter_by(name=p_data["name"]).first()
            if not existing:
                new_pattern = MaskingPattern(
                    name=p_data["name"],
                    description=p_data["description"],
                    maskingType=p_data["maskingType"],
                    maskingArgs=p_data["maskingArgs"]
                )
                db.add(new_pattern)
                print(f"Created: {p_data['name']}")
            else:
                print(f"Skipped (Exists): {p_data['name']}")
        
        db.commit()
        print("Done.")

    except Exception as e:
        print(f"Error seeding patterns: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_patterns()
