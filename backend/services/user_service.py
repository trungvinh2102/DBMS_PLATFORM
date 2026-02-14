"""
user_service.py

User service for profile, settings, and role management.
"""

from models.metadata import User, UserSetting, UserRole, Role
from utils.db_utils import with_session
from sqlalchemy.orm import joinedload
import uuid

class UserService:
    """
    Service for managing user profile, settings and roles.
    """

    @with_session
    def list_users(self, session):
        """List information of all users."""
        users = session.query(User).options(joinedload(User.roles)).all()
        return [self._serialize_user(u) for u in users]

    @with_session
    def get_profile(self, session, user_id):
        """
        Retrieves user profile information.
        """
        user = session.query(User).options(joinedload(User.roles)).filter(User.id == user_id).first()
        if not user:
            return None
        
        return self._serialize_user(user)

    @with_session
    def get_settings(self, session, user_id):
        """
        Retrieves user settings.
        """
        setting = session.query(UserSetting).filter(UserSetting.userId == user_id).first()
        if setting:
            return setting.settings
        return None

    @with_session
    def update_settings(self, session, user_id, settings_data):
        """
        Updates or creates user settings.
        """
        setting = session.query(UserSetting).filter(UserSetting.userId == user_id).first()
        if setting:
            setting.settings = settings_data
        else:
            new_setting = UserSetting(
                id=str(uuid.uuid4()),
                userId=user_id,
                settings=settings_data
            )
            session.add(new_setting)
        session.commit()
        return {"success": True}

    @with_session
    def add_role_to_user(self, session, user_id, role_id):
        """Assigns a role to a user."""
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            raise Exception("User not found")
        role = session.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise Exception("Role not found")
            
        existing = session.query(UserRole).filter(
            UserRole.userId == user_id, 
            UserRole.roleId == role_id
        ).first()
        
        if existing:
            return {"success": True, "message": "Role already assigned"} # Idempotent

        new_assignment = UserRole(userId=user_id, roleId=role_id)
        session.add(new_assignment)
        session.commit()
        return {"success": True}

    @with_session
    def remove_role_from_user(self, session, user_id, role_id):
        """Removes a role from a user."""
        assignment = session.query(UserRole).filter(
            UserRole.userId == user_id, 
            UserRole.roleId == role_id
        ).first()
        
        if not assignment:
             raise Exception("Role not assigned to user")
             
        session.delete(assignment)
        session.commit()
        return {"success": True}

    def _serialize_user(self, user):
        # Handle backward compatibility logic if needed, but primarily use user.roles
        role_names = [r.name for r in user.roles]
        
        # If user.roles is empty but user.roleId exists (legacy), fetch it
        # Note: In pure clean code we'd migrate data and drop roleId.
        # But here we show roles.
        
        return {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "name": user.name,
            "roles": role_names,
            # Legacy fields - can return multiple roles joined or primary role
            "role": role_names[0] if role_names else None 
        }

user_service = UserService()
