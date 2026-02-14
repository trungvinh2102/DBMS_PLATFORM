"""
privilege_service.py

Service for managing Privilege Types and Role-Privilege bindings.
"""

import uuid
import logging
from models.metadata import (
    PrivilegeTypeModel,
    RolePrivilege,
    Role,
    PrivilegeCategory,
    ResourceTypeEnum,
    User,
)
from utils.db_utils import with_session
from sqlalchemy.orm import joinedload

logger = logging.getLogger(__name__)


# ── Default Privilege Type Definitions ────────────────────────────
DEFAULT_PRIVILEGES = [
    # DATA_ACCESS
    {"code": "READ_RAW", "category": "DATA_ACCESS", "description": "Read raw/original data without any transformation"},
    {"code": "READ_MASKED", "category": "DATA_ACCESS", "description": "Read data with masking applied to sensitive fields"},
    {"code": "READ_AGGREGATE", "category": "DATA_ACCESS", "description": "Read aggregated data only (COUNT, SUM, AVG)"},
    {"code": "READ_METADATA", "category": "DATA_ACCESS", "description": "Read schema metadata (tables, columns, types)"},
    # DATA_MUTATION
    {"code": "INSERT", "category": "DATA_MUTATION", "description": "Insert new records into tables"},
    {"code": "UPDATE", "category": "DATA_MUTATION", "description": "Update existing records in tables"},
    {"code": "DELETE", "category": "DATA_MUTATION", "description": "Delete records from tables"},
    {"code": "UPSERT", "category": "DATA_MUTATION", "description": "Insert or update records (upsert)"},
    # QUERY_CAPABILITY
    {"code": "JOIN", "category": "QUERY_CAPABILITY", "description": "Use JOIN operations in queries"},
    {"code": "SUBQUERY", "category": "QUERY_CAPABILITY", "description": "Use subqueries in SQL statements"},
    {"code": "FILTER", "category": "QUERY_CAPABILITY", "description": "Apply WHERE/HAVING filters"},
    {"code": "GROUP_BY", "category": "QUERY_CAPABILITY", "description": "Use GROUP BY aggregation"},
    {"code": "ORDER_BY", "category": "QUERY_CAPABILITY", "description": "Use ORDER BY sorting"},
    {"code": "WINDOW_FUNCTION", "category": "QUERY_CAPABILITY", "description": "Use window functions (ROW_NUMBER, RANK, etc.)"},
    {"code": "UNION", "category": "QUERY_CAPABILITY", "description": "Use UNION/UNION ALL operations"},
    # DATA_EXFILTRATION
    {"code": "EXPORT_CSV", "category": "DATA_EXFILTRATION", "description": "Export query results to CSV format"},
    {"code": "EXPORT_EXCEL", "category": "DATA_EXFILTRATION", "description": "Export query results to Excel format"},
    {"code": "EXPORT_JSON", "category": "DATA_EXFILTRATION", "description": "Export query results to JSON format"},
    {"code": "COPY_CLIPBOARD", "category": "DATA_EXFILTRATION", "description": "Copy query results to clipboard"},
    {"code": "DOWNLOAD", "category": "DATA_EXFILTRATION", "description": "Download data files"},
    {"code": "API_ACCESS", "category": "DATA_EXFILTRATION", "description": "Access data via external API"},
    # SENSITIVE
    {"code": "VIEW_PII", "category": "SENSITIVE", "description": "View Personally Identifiable Information"},
    {"code": "VIEW_SENSITIVE", "category": "SENSITIVE", "description": "View sensitive/classified data"},
    {"code": "DECRYPT", "category": "SENSITIVE", "description": "Decrypt encrypted data fields"},
    {"code": "UNMASK", "category": "SENSITIVE", "description": "Unmask masked data fields"},
    # SYSTEM
    {"code": "ADMIN", "category": "SYSTEM", "description": "Full system administration access"},
    {"code": "POLICY_WRITE", "category": "SYSTEM", "description": "Create and modify access policies"},
    {"code": "MASKING_CONFIG", "category": "SYSTEM", "description": "Configure data masking rules"},
    {"code": "SCHEMA_MODIFY", "category": "SYSTEM", "description": "Modify database schema (DDL operations)"},
    {"code": "AUDIT_VIEW", "category": "SYSTEM", "description": "View audit logs and compliance reports"},
]


class PrivilegeService:
    """Service for CRUD operations on Privilege Types and Role Privileges."""

    # ── Privilege Types ────────────────────────────────────────────

    @with_session
    def list_privilege_types(self, session, category=None):
        """List all privilege types, optionally filtered by category."""
        query = session.query(PrivilegeTypeModel)
        if category:
            query = query.filter(PrivilegeTypeModel.category == PrivilegeCategory(category))
        privileges = query.order_by(PrivilegeTypeModel.category, PrivilegeTypeModel.code).all()
        return [self._serialize_privilege_type(p) for p in privileges]

    @with_session
    def get_privilege_type(self, session, privilege_id):
        """Get a single privilege type by ID."""
        p = session.query(PrivilegeTypeModel).filter(PrivilegeTypeModel.id == privilege_id).first()
        if not p:
            return None
        return self._serialize_privilege_type(p)

    @with_session
    def create_privilege_type(self, session, data):
        """Create a new privilege type."""
        # Check uniqueness
        existing = session.query(PrivilegeTypeModel).filter(
            PrivilegeTypeModel.code == data["code"]
        ).first()
        if existing:
            raise Exception(f"Privilege type with code '{data['code']}' already exists")

        new_priv = PrivilegeTypeModel(
            id=str(uuid.uuid4()),
            code=data["code"],
            category=PrivilegeCategory(data["category"]),
            description=data.get("description"),
        )
        session.add(new_priv)
        session.commit()
        return self._serialize_privilege_type(new_priv)

    @with_session
    def update_privilege_type(self, session, privilege_id, data):
        """Update an existing privilege type."""
        p = session.query(PrivilegeTypeModel).filter(PrivilegeTypeModel.id == privilege_id).first()
        if not p:
            raise Exception("Privilege type not found")
        if "code" in data:
            p.code = data["code"]
        if "category" in data:
            p.category = PrivilegeCategory(data["category"])
        if "description" in data:
            p.description = data["description"]
        session.commit()
        return self._serialize_privilege_type(p)

    @with_session
    def delete_privilege_type(self, session, privilege_id):
        """Delete a privilege type."""
        p = session.query(PrivilegeTypeModel).filter(PrivilegeTypeModel.id == privilege_id).first()
        if not p:
            raise Exception("Privilege type not found")
        session.delete(p)
        session.commit()
        return {"success": True}

    # ── Role Privileges ────────────────────────────────────────────

    @with_session
    def list_role_privileges(self, session, role_id=None, resource_type=None, resource_id=None):
        """List role privileges, optionally filtered by role and resource."""
        query = session.query(RolePrivilege)
        if role_id:
            query = query.filter(RolePrivilege.roleId == role_id)
        if resource_type:
            query = query.filter(RolePrivilege.resourceType == ResourceTypeEnum(resource_type))
        if resource_id:
            query = query.filter(RolePrivilege.resourceId == resource_id)
            
        rps = query.all()
        return [self._serialize_role_privilege(rp, session) for rp in rps]

    @with_session
    def assign_privilege(self, session, data):
        """Assign a privilege type to a role with resource binding."""
        # Validate role exists
        role = session.query(Role).filter(Role.id == data["roleId"]).first()
        if not role:
            raise Exception("Role not found")
        
        # Validate privilege type exists
        pt = session.query(PrivilegeTypeModel).filter(
            PrivilegeTypeModel.id == data["privilegeTypeId"]
        ).first()
        if not pt:
            raise Exception("Privilege type not found")

        new_rp = RolePrivilege(
            id=str(uuid.uuid4()),
            roleId=data["roleId"],
            privilegeTypeId=data["privilegeTypeId"],
            resourceType=ResourceTypeEnum(data.get("resourceType", "SYSTEM")),
            resourceId=data.get("resourceId"),
            conditionExpr=data.get("conditionExpr"),
        )
        session.add(new_rp)
        session.commit()
        return self._serialize_role_privilege(new_rp, session)

    @with_session
    def revoke_privilege(self, session, role_privilege_id):
        """Remove a privilege assignment from a role."""
        rp = session.query(RolePrivilege).filter(RolePrivilege.id == role_privilege_id).first()
        if not rp:
            raise Exception("Role privilege assignment not found")
        session.delete(rp)
        session.commit()
        return {"success": True}

    # ── Seed Defaults ──────────────────────────────────────────────

    @with_session
    def seed_defaults(self, session):
        """Seed all default privilege types into the database."""
        created = 0
        for priv_data in DEFAULT_PRIVILEGES:
            existing = session.query(PrivilegeTypeModel).filter(
                PrivilegeTypeModel.code == priv_data["code"]
            ).first()
            if existing:
                existing.description = priv_data["description"]
                existing.category = PrivilegeCategory(priv_data["category"])
            else:
                new_priv = PrivilegeTypeModel(
                    id=str(uuid.uuid4()),
                    code=priv_data["code"],
                    category=PrivilegeCategory(priv_data["category"]),
                    description=priv_data["description"],
                )
                session.add(new_priv)
                created += 1
        session.commit()
        logger.info(f"Seeded {created} new privilege types, updated {len(DEFAULT_PRIVILEGES) - created} existing")
        return {"created": created, "total": len(DEFAULT_PRIVILEGES)}

    # ── Helpers ─────────────────────────────────────────────────

    def get_categories(self):
        """Return list of available privilege categories."""
        return [{"value": c.value, "label": c.value.replace("_", " ").title()} for c in PrivilegeCategory]

    def get_resource_types(self):
        """Return list of available resource types."""
        return [{"value": r.value, "label": r.value.title()} for r in ResourceTypeEnum]

    def _serialize_privilege_type(self, p):
        return {
            "id": p.id,
            "code": p.code,
            "category": p.category.value if p.category else None,
            "description": p.description,
            "created_on": p.created_on.isoformat() if p.created_on else None,
            "changed_on": p.changed_on.isoformat() if p.changed_on else None,
        }

    def _serialize_role_privilege(self, rp, session):
        # Eager-load names for convenience
        role = session.query(Role).filter(Role.id == rp.roleId).first()
        pt = session.query(PrivilegeTypeModel).filter(PrivilegeTypeModel.id == rp.privilegeTypeId).first()
        return {
            "id": rp.id,
            "roleId": rp.roleId,
            "roleName": role.name if role else None,
            "privilegeTypeId": rp.privilegeTypeId,
            "privilegeCode": pt.code if pt else None,
            "privilegeCategory": pt.category.value if pt else None,
            "resourceType": rp.resourceType.value if rp.resourceType else None,
            "resourceId": rp.resourceId,
            "conditionExpr": rp.conditionExpr,
            "created_on": rp.created_on.isoformat() if rp.created_on else None,
        }

    # ── User Privileges (Effective Resolution) ─────────────────────

    @with_session
    def get_user_privileges(self, session, user_id):
        """
        Resolve all effective privileges for a user, including:
        - Direct role assignments
        - Inherited roles (parent roles)
        """
        # 1. Get user with roles
        user = session.query(User).options(joinedload(User.roles)).filter(User.id == user_id).first()
        if not user:
            raise Exception("User not found")

        # 2. Resolve role hierarchy (recursive)
        all_roles = set()
        queue = list(user.roles)
        
        # Add backward compatibility for roleId if roles is empty but roleId exists
        if not queue and user.roleId:
            legacy_role = session.query(Role).filter(Role.id == user.roleId).first()
            if legacy_role:
                queue.append(legacy_role)

        while queue:
            role = queue.pop(0)
            if role.id in [r.id for r in all_roles]:
                continue
            all_roles.add(role)
            
            # Add parent role if exists
            if role.parentId:
                parent = session.query(Role).filter(Role.id == role.parentId).first()
                if parent:
                    queue.append(parent)

        # 3. Get privileges for all resolved roles
        if not all_roles:
            return []

        role_ids = [r.id for r in all_roles]
        
        # Fetch role privileges with eager loading of PrivilegeType
        rps = session.query(RolePrivilege).options(
            joinedload(RolePrivilege.privilegeType)
        ).filter(
            RolePrivilege.roleId.in_(role_ids)
        ).all()

        # 4. Serialize
        # We might want to deduplicate or just return all entries
        # Returns flat list of effective permissions
        
        results = []
        for rp in rps:
            item = self._serialize_role_privilege(rp, session)
            # Add role name for context
            item['inheritedFromRole'] = next((r.name for r in all_roles if r.id == rp.roleId), None)
            results.append(item)
            
        return results


privilege_service = PrivilegeService()
