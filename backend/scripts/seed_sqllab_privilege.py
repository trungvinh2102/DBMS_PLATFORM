
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.privilege_service import privilege_service
from models.metadata import Role, PrivilegeTypeModel, RolePrivilege, Base, engine, SessionLocal

# Force DB URL if not set (development)
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@127.0.0.1:5432/dbms_platform"
    # Re-init engine if needed, but normally models/metadata.py runs on import.
    # If it ran before env var was set, engine might be None.
    from sqlalchemy import create_engine
    engine = create_engine(os.environ["DATABASE_URL"])
    SessionLocal.configure(bind=engine)

def seed_sqllab_access():
    print("Seeding SQLLab_ACCESS privilege...")
    
    # 1. Seed the new privilege type
    try:
        result = privilege_service.seed_defaults()
        print(f"Seeding result: {result}")
    except Exception as e:
        print(f"Error seeding privileges: {e}")
        return

    # 2. Assign to Admin and Creator and Default (optional, but requested behavior implies manual request)
    # The requirement says: "If user doesn't have access, show request."
    # So we should assign this ONLY to privileged roles, and NOT to Viewer/Default.
    
    db = SessionLocal()
    try:
        # Get SQLLab_ACCESS privilege ID
        priv = db.query(PrivilegeTypeModel).filter(PrivilegeTypeModel.code == "SQLLab_ACCESS").first()
        if not priv:
            print("Error: SQLLab_ACCESS privilege not found after seeding.")
            return

        roles_to_grant = ["Admin", "Creator"]
        
        for role_name in roles_to_grant:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                print(f"Role {role_name} not found.")
                continue
                
            # Check if already has it
            existing = db.query(RolePrivilege).filter(
                RolePrivilege.roleId == role.id,
                RolePrivilege.privilegeTypeId == priv.id
            ).first()
            
            if not existing:
                try:
                    privilege_service.assign_privilege({
                        "roleId": role.id,
                        "privilegeTypeId": priv.id,
                        "resourceType": "SYSTEM"
                    })
                    print(f"Granted SQLLab_ACCESS to {role_name}")
                except Exception as ex:
                    print(f"Failed to grant to {role_name}: {ex}")
            else:
                print(f"{role_name} already has SQLLab_ACCESS")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_sqllab_access()
