"""
backend/scripts/migrate_rbac_v2.py

Migrates the database to support RBAC v2 Schema:
1. Creates 'user_roles' table (Many-to-Many).
2. Adds 'parentId' and 'item_type' to 'roles' table.
3. Migrates existing 'users.roleId' data to 'user_roles'.
4. Makes 'users.roleId' nullable (for backward compatibility).

Usage:
    cd backend
    python scripts/migrate_rbac_v2.py
"""

import sys
import os

# Add parent directory to path to import backend modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from sqlalchemy import create_engine, text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

MIGRATION_SQL = """
-- 1. Create user_roles table
CREATE TABLE IF NOT EXISTS "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId", "roleId"),
    CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Add columns to roles table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='parentId') THEN
        ALTER TABLE "roles" ADD COLUMN "parentId" TEXT;
        ALTER TABLE "roles" ADD CONSTRAINT "roles_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "roles"("id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='item_type') THEN
        ALTER TABLE "roles" ADD COLUMN "item_type" TEXT DEFAULT 'CUSTOM';
    END IF;
END$$;

-- 3. Migrate data: Insert existing User->Role relationships into user_roles
INSERT INTO "user_roles" ("userId", "roleId")
SELECT "id", "roleId"
FROM "users"
WHERE "roleId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Make users.roleId nullable
ALTER TABLE "users" ALTER COLUMN "roleId" DROP NOT NULL;
"""

def migrate():
    if not DATABASE_URL:
        logger.error("DATABASE_URL is not set.")
        return

    engine = create_engine(DATABASE_URL)
    
    logger.info("Starting RBAC v2 migration...")
    
    with engine.connect() as conn:
        try:
            conn.execute(text(MIGRATION_SQL))
            conn.commit()
            logger.info("Migration completed successfully!")
            logger.info("- Created user_roles table")
            logger.info("- Added parentId to roles")
            logger.info("- Migrated user role assignments")
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            conn.rollback()

if __name__ == "__main__":
    migrate()
