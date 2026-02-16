"""
backend/scripts/seed.py

Database seed script - Creates initial roles, admin user, and local database connection.
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

from models.metadata import SessionLocal, Role, User, Db, PrivilegeTypeModel, RolePrivilege
from services.privilege_service import privilege_service
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
                existing.description = role_data["description"]
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
        admin_email = "admin@dbms.local"
        admin_password = "password123"

        admin_role = session.query(Role).filter(Role.name == "Admin").first()
        if not admin_role:
            logger.error("Admin role not found! Cannot create admin user.")
            return

        existing_admin = session.query(User).filter(User.email == admin_email).first()
        if existing_admin:
            existing_admin.roleId = admin_role.id
            existing_admin.username = "admin"
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

        # ── 3. Seed Local Database Connection ──────────────────────────
        logger.info("Seeding Local Database Connection...")
        existing_db = session.query(Db).filter(Db.databaseName == "dbms_platform").first()

        if not existing_db:
            local_db = Db(
                id=str(uuid.uuid4()),
                databaseName="dbms_platform",
                type="postgres",
                config={
                    "host": "localhost",
                    "port": 5432,
                    "user": "postgres",
                    "password": encrypt("postgres"),
                    "database": "dbms_platform",
                },
            )
            session.add(local_db)
            session.commit()
            logger.info("  Created local database connection: dbms_platform")
        else:
            logger.info("  Local database connection already exists, skipping.")

        # ── 4. Seed Privilege Types ────────────────────────────────────
        logger.info("Seeding Privilege Types...")
        result = privilege_service.seed_defaults()
        logger.info(f"  Privilege types: {result['created']} created, {result['total']} total")

        # ── 5. Assign Default Privileges to Admin ──────────────────────
        logger.info("Assigning default privileges to Admin...")
        admin_role = session.query(Role).filter(Role.name == "Admin").first()
        if admin_role:
            default_privs = ["SQLLab_ACCESS", "CONNECTIONS_ACCESS"]
            for code in default_privs:
                priv = session.query(PrivilegeTypeModel).filter(PrivilegeTypeModel.code == code).first()
                if priv:
                    existing = session.query(RolePrivilege).filter(
                        RolePrivilege.roleId == admin_role.id,
                        RolePrivilege.privilegeTypeId == priv.id
                    ).first()
                    
                    if not existing:
                         privilege_service.assign_privilege({
                            "roleId": admin_role.id,
                            "privilegeTypeId": priv.id,
                            "resourceType": "SYSTEM"
                        })
                         logger.info(f"  Granted {code} to Admin")
        
        logger.info("Seeding completed successfully!")

    except Exception as e:
        session.rollback()
        logger.error(f"Seeding failed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()
