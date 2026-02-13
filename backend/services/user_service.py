"""
user_service.py

User service for profile and settings management.
"""

from models.metadata import User, UserSetting
from utils.db_utils import with_session
import uuid

class UserService:
    """
    Service for managing user profile and settings.
    """

    @with_session
    def get_profile(self, session, user_id):
        """
        Retrieves user profile information.
        """
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        return {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "name": user.name,
            "role": user.role.name if user.role else None
        }

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

user_service = UserService()
