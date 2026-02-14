"""
seed_sensitive_data.py

Script to seed example sensitive resources and policies for testing.
"""
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the parent directory to sys.path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.metadata import SessionLocal, Db, Role
from models.sensitive_data import SensitiveResource, SensitivePolicy, SensitivityLevel, ProtectionStrategy, ResourceType

def seed_data():
    session = SessionLocal()
    try:
        # 1. Get a database
        databases = session.query(Db).all()
        if not databases:
            print("No databases found. Please add a database connection first.")
            return
        
        target_db = databases[0]
        print(f"Targeting database: {target_db.databaseName} ({target_db.id})")

        # 2. Get roles
        roles = {role.name: role for role in session.query(Role).all()}
        if not roles:
            print("No roles found. Please seed roles first.")
            return
        
        # 3. Define example resources
        example_resources = [
            {
                "resource_type": ResourceType.COLUMN,
                "resource_name": "public.users.email",
                "sensitivity_level": SensitivityLevel.PII,
                "owner": "Security Team",
                "description": "User email addresses"
            },
            {
                "resource_type": ResourceType.COLUMN,
                "resource_name": "hr.employees.salary",
                "sensitivity_level": SensitivityLevel.CRITICAL,
                "owner": "HR Department",
                "description": "Employee salary information"
            },
            {
                "resource_type": ResourceType.COLUMN,
                "resource_name": "finance.accounts.balance",
                "sensitivity_level": SensitivityLevel.CONFIDENTIAL,
                "owner": "Finance Team",
                "description": "Account balance data"
            },
            {
                "resource_type": ResourceType.TABLE,
                "resource_name": "admin.security_tokens",
                "sensitivity_level": SensitivityLevel.SENSITIVE,
                "owner": "IT Infrastructure",
                "description": "System access tokens table"
            }
        ]

        inserted_resources = []
        for res_data in example_resources:
            # Check if exists
            exists = session.query(SensitiveResource).filter_by(
                resource_name=res_data["resource_name"],
                database_id=target_db.id
            ).first()
            
            if not exists:
                res = SensitiveResource(
                    resource_type=res_data["resource_type"],
                    resource_name=res_data["resource_name"],
                    sensitivity_level=res_data["sensitivity_level"],
                    database_id=target_db.id,
                    owner=res_data["owner"],
                    description=res_data["description"]
                )
                session.add(res)
                inserted_resources.append(res)
                print(f"Added resource: {res.resource_name}")
            else:
                inserted_resources.append(exists)
                print(f"Resource already exists: {res_data['resource_name']}")

        session.commit()

        # 4. Define example policies
        # Only add if we have Analyst and Manager roles or similar
        analyst_role = roles.get("Analyst") or roles.get("Viewer")
        manager_role = roles.get("Manager") or roles.get("Admin")

        if not analyst_role:
             # Try to get any role if standard ones don't exist
             analyst_role = list(roles.values())[0]

        policies_to_add = []
        
        # Policy for Email (PII)
        email_res = next((r for r in inserted_resources if "email" in r.resource_name), None)
        if email_res and analyst_role:
            policies_to_add.append({
                "resource_id": email_res.id,
                "role_id": analyst_role.id,
                "privilege_type": "VIEW_SENSITIVE",
                "protection_strategy": ProtectionStrategy.MASKING,
                "policy_expr": "mask_email(email)"
            })
        
        # Policy for Salary (CRITICAL)
        salary_res = next((r for r in inserted_resources if "salary" in r.resource_name), None)
        if salary_res and analyst_role:
            policies_to_add.append({
                "resource_id": salary_res.id,
                "role_id": analyst_role.id,
                "privilege_type": "VIEW_SENSITIVE",
                "protection_strategy": ProtectionStrategy.ACCESS_DENY,
                "policy_expr": "DENY ALL"
            })
        
        if salary_res and manager_role:
             policies_to_add.append({
                "resource_id": salary_res.id,
                "role_id": manager_role.id,
                "privilege_type": "UNMASK",
                "protection_strategy": ProtectionStrategy.REDACTION,
                "policy_expr": "show_last=4"
            })

        for pol_data in policies_to_add:
            exists = session.query(SensitivePolicy).filter_by(
                resource_id=pol_data["resource_id"],
                role_id=pol_data["role_id"]
            ).first()
            
            if not exists:
                pol = SensitivePolicy(
                    resource_id=pol_data["resource_id"],
                    role_id=pol_data["role_id"],
                    privilege_type=pol_data["privilege_type"],
                    protection_strategy=pol_data["protection_strategy"],
                    policy_expr=pol_data["policy_expr"]
                )
                session.add(pol)
                print(f"Added policy for resource_id: {pol.resource_id}")

        session.commit()
        print("Successfully seeded Sensitive Data.")

    except Exception as e:
        print(f"Error seeding data: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    seed_data()
