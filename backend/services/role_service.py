"""
role_service.py

Service for managing Roles and Role Hierarchy.
"""
import uuid
import logging
from sqlalchemy.orm import joinedload
from models.metadata import Role, RolePrivilege
from utils.db_utils import with_session

logger = logging.getLogger(__name__)

class RoleService:

    @with_session
    def list_roles(self, session):
        """List all roles with basic info."""
        roles = session.query(Role).order_by(Role.name).all()
        return [self._serialize_role(r) for r in roles]

    @with_session
    def get_role_hierarchy(self, session):
        """Get roles in a hierarchical structure (tree)."""
        # Fetch all roles
        roles = session.query(Role).order_by(Role.name).all()
        role_map = {r.id: self._serialize_role(r) for r in roles}
        
        root_roles = []
        for r in roles:
            if r.parentId:
                parent = role_map.get(r.parentId)
                if parent:
                    if "children" not in parent:
                        parent["children"] = []
                    parent["children"].append(role_map[r.id])
            else:
                root_roles.append(role_map[r.id])
        
        return root_roles

    @with_session
    def get_role(self, session, role_id):
        """Get a single role by ID."""
        role = session.query(Role).filter(Role.id == role_id).first()
        if not role:
            return None
        return self._serialize_role(role)

    @with_session
    def create_role(self, session, data):
        """Create a new role."""
        existing = session.query(Role).filter(Role.name == data["name"]).first()
        if existing:
            raise Exception(f"Role with name '{data['name']}' already exists")

        new_role = Role(
            id=str(uuid.uuid4()),
            name=data["name"],
            description=data.get("description"),
            parentId=data.get("parentId"),
            item_type=data.get("item_type", "CUSTOM")
        )
        session.add(new_role)
        session.commit()
        return self._serialize_role(new_role)

    @with_session
    def update_role(self, session, role_id, data):
        """Update an existing role."""
        role = session.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise Exception("Role not found")
            
        if "name" in data:
            # check uniqueness
            existing = session.query(Role).filter(
                Role.name == data["name"], 
                Role.id != role_id
            ).first()
            if existing:
                raise Exception(f"Role name '{data['name']}' already taken")
            role.name = data["name"]
            
        if "description" in data:
            role.description = data["description"]
        if "parentId" in data:
            # Prevent circular reference (basic check: parent != self)
            if data["parentId"] == role_id:
                raise Exception("Cannot set parent to self")
            role.parentId = data["parentId"]
            
        session.commit()
        return self._serialize_role(role)

    @with_session
    def delete_role(self, session, role_id):
        """Delete a role."""
        role = session.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise Exception("Role not found")
        
        # Check if system role
        if role.item_type == "SYSTEM":
             raise Exception("Cannot delete SYSTEM role")
             
        session.delete(role)
        session.commit()
        return {"success": True}

    def _serialize_role(self, role):
        return {
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "parentId": role.parentId,
            "item_type": role.item_type,
            "created_on": role.created_on.isoformat() if role.created_on else None,
            "changed_on": role.changed_on.isoformat() if role.changed_on else None,
        }

role_service = RoleService()
