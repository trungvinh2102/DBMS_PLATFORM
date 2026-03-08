"""
backend/services/user_service.py
User service for profile and settings.
"""
from models.metadata import User, UserSetting, SessionLocal
import uuid
import json

class UserService:
    def get_profile(self, user_id):
        session = SessionLocal()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user: return None
            return {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "name": user.name,
                "role": user.role.name if user.role else None
            }
        finally:
            session.close()

    def get_settings(self, user_id):
        session = SessionLocal()
        try:
            # Check UserSetting
            setting = session.query(UserSetting).filter(UserSetting.userId == user_id).first()
            if setting:
                return setting.settings
            return None
        finally:
            session.close()

    def update_settings(self, user_id, settings_data):
        session = SessionLocal()
        try:
            setting = session.query(UserSetting).filter(UserSetting.userId == user_id).first()
            if setting:
                # Merge or replace? The existing API seemed to be UPSERT replacing
                # Logic: setting.settings = settings_data
                # But if we want partial update, we merge.
                # Assuming complete replacement or careful merge from frontend.
                # The generic update usually replaces the JSON blob.
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
        finally:
            session.close()

user_service = UserService()
