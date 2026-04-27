"""
backend/scripts/seed.py

Database seed script - Creates initial roles and admin user.
Replaces the old Prisma seed.ts from packages/db.

Usage:
    cd backend
    python scripts/seed.py
"""

import sys
import os

# Add backend root to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from models.metadata import SessionLocal, Role, User
from utils.crypto import encrypt
import uuid
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed():
    session = SessionLocal()

    try:
        # ── 1. Seed Roles ──────────────────────────────────────────────
        logger.info("Seeding Roles...")
        roles_data = [
            {"name": "Admin", "description": "Full system access"},
            {"name": "Creator", "description": "Can create and manage resources"},
            {"name": "Viewer", "description": "Can view shared resources"},
            {"name": "Default", "description": "Basic access"},
        ]

        for role_data in roles_data:
            existing = session.query(Role).filter(Role.name == role_data["name"]).first()
            if existing:
                existing.description = role_data["description"] # type: ignore
                logger.info(f"  Updated role: {role_data['name']}")
            else:
                role = Role(
                    id=str(uuid.uuid4()),
                    name=role_data["name"],
                    description=role_data["description"],
                )
                session.add(role)
                logger.info(f"  Created role: {role_data['name']}")

        session.commit()

        # ── 2. Seed Admin User ─────────────────────────────────────────
        logger.info("Seeding Admin User...")
        admin_email = "admin@quriodb.local"
        admin_password = "password123"

        admin_role = session.query(Role).filter(Role.name == "Admin").first()
        if not admin_role:
            logger.error("Admin role not found! Cannot create admin user.")
            return

        existing_admin = session.query(User).filter(User.email == admin_email).first()
        if existing_admin:
            existing_admin.roleId = admin_role.id
            existing_admin.username = "admin" # type: ignore
            logger.info(f"  Updated admin user: {admin_email}")
        else:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            hashed = pwd_context.hash(admin_password)

            admin_user = User(
                id=str(uuid.uuid4()),
                email=admin_email,
                username="admin",
                name="System Admin",
                password=hashed,
                roleId=admin_role.id,
            )
            session.add(admin_user)
            logger.info(f"  Created admin user: username=admin / email={admin_email} / password={admin_password}")

        session.commit()



        logger.info("Seeding completed successfully!")

    except Exception as e:
        session.rollback()
        logger.error(f"Seeding failed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()
