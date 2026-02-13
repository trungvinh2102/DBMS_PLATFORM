"""
backend/scripts/migrate_privileges.py

Creates the privilege_types and role_privileges tables and their enums.
Run this ONCE to set up the new tables.

Usage:
    cd backend
    python scripts/migrate_privileges.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from sqlalchemy import create_engine, text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

MIGRATION_SQL = """
-- Create PrivilegeCategory enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PrivilegeCategory') THEN
        CREATE TYPE "PrivilegeCategory" AS ENUM (
            'DATA_ACCESS',
            'DATA_MUTATION',
            'QUERY_CAPABILITY',
            'DATA_EXFILTRATION',
            'SENSITIVE',
            'SYSTEM'
        );
    END IF;
END$$;

-- Create ResourceType enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResourceType') THEN
        CREATE TYPE "ResourceType" AS ENUM (
            'TABLE',
            'COLUMN',
            'DATASET',
            'API',
            'SYSTEM'
        );
    END IF;
END$$;

-- Create privilege_types table if not exists
CREATE TABLE IF NOT EXISTS "privilege_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" "PrivilegeCategory" NOT NULL,
    "description" TEXT,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privilege_types_pkey" PRIMARY KEY ("id")
);

-- Create unique index on code
CREATE UNIQUE INDEX IF NOT EXISTS "privilege_types_code_key" ON "privilege_types"("code");

-- Create role_privileges table if not exists
CREATE TABLE IF NOT EXISTS "role_privileges" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "privilegeTypeId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" TEXT,
    "conditionExpr" TEXT,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_privileges_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "role_privileges_roleId_idx" ON "role_privileges"("roleId");
CREATE INDEX IF NOT EXISTS "role_privileges_privilegeTypeId_idx" ON "role_privileges"("privilegeTypeId");

-- Add foreign keys (use IF NOT EXISTS pattern)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'role_privileges_roleId_fkey'
    ) THEN
        ALTER TABLE "role_privileges"
            ADD CONSTRAINT "role_privileges_roleId_fkey" 
            FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'role_privileges_privilegeTypeId_fkey'
    ) THEN
        ALTER TABLE "role_privileges"
            ADD CONSTRAINT "role_privileges_privilegeTypeId_fkey" 
            FOREIGN KEY ("privilegeTypeId") REFERENCES "privilege_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;
"""

def migrate():
    engine = create_engine(DATABASE_URL)
    
    logger.info("Running privilege types migration...")
    
    with engine.connect() as conn:
        conn.execute(text(MIGRATION_SQL))
        conn.commit()
    
    logger.info("Migration completed successfully!")
    logger.info("Tables created: privilege_types, role_privileges")
    logger.info("Enums created: PrivilegeCategory, ResourceType")


if __name__ == "__main__":
    migrate()
