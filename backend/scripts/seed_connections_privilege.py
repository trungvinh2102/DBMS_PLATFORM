
import os
import sys

# Force DB URL if not set
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/dbms_platform"

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from models.metadata import Role, PrivilegeTypeModel, RolePrivilege, Base, engine, SessionLocal

# Adjust import based on project structure
try:
    from services.privilege_service import PrivilegeService
    privilege_service = PrivilegeService()
except ImportError:
    # If service is not importable directly
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../services')))
    from privilege_service import PrivilegeService
    privilege_service = PrivilegeService()

def get_db():
    if not os.getenv("DATABASE_URL"):
        # Default for local dev if not set
        os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/dbms_platform"
    
    engine = create_engine(os.environ["DATABASE_URL"])
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def seed_connections_access():
    print("Seeding CONNECTIONS_ACCESS privilege...")
    
    db = get_db()
    
    try:
        # 1. Seed defaults to ensure CONNECTIONS_ACCESS type exists
        privilege_service.seed_defaults()
        
        # 2. Get the privilege type
        priv = db.query(PrivilegeTypeModel).filter(PrivilegeTypeModel.code == "CONNECTIONS_ACCESS").first()
        if not priv:
            print("Error: CONNECTIONS_ACCESS privilege type not found!")
            return

        # 3. Assign ONLY to Admin role
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        if not admin_role:
             print("Error: Admin role not found!")
             return

        # Check existing
        existing = db.query(RolePrivilege).filter(
            RolePrivilege.roleId == admin_role.id,
            RolePrivilege.privilegeTypeId == priv.id
        ).first()

        if not existing:
            try:
                # We can use the service or direct DB insert. Service adds validation/UUID.
                # Service method requires session implicitly via decorator but we called seed_defaults which uses its own session unless passed.
                # Actually privilege_service methods use @with_session which creates a NEW session if not passed.
                # Let's use the service but we need to be careful about session management.
                
                # The service method signiture is: assign_privilege(self, session, data)
                # But @with_session decorator handles session generation.
                
                privilege_service.assign_privilege({
                    "roleId": admin_role.id,
                    "privilegeTypeId": priv.id,
                    "resourceType": "SYSTEM"
                })
                print("Granted CONNECTIONS_ACCESS to Admin role.")
            except Exception as e:
                print(f"Failed to assign privilege: {e}")
        else:
            print("Admin role already has CONNECTIONS_ACCESS.")
            
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_connections_access()
