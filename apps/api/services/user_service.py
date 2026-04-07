"""
user_service.py

User service for managing profiles, settings, and preferences.
"""
from models.metadata import User, UserSetting, SessionLocal
import uuid
import json
import os
import base64
import re
import cloudinary
import cloudinary.uploader

from services.auth_service import auth_service

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_SECRET") or os.getenv("CLOUNDINARY_SECRET") # Handle user typo
)

class UserService:

    def get_profile(self, user_id):
        # Handle desktop mode mock user
        if user_id == "desktop-admin-id":
            return {
                "id": "desktop-admin-id",
                "email": "admin@dbms.local",
                "username": "admin",
                "name": "Local Desktop Admin",
                "avatarUrl": None,
                "bio": "Running in Desktop Mode (No Auth)",
                "role": "Admin"
            }
            
        session = SessionLocal()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user: return None
            return {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "name": user.name,
                "avatarUrl": user.avatarUrl,
                "bio": user.bio,
                "role": user.role.name if user.role else None
            }
        finally:
            if session:
                session.close()


    def update_profile(self, user_id, data):
        session = SessionLocal()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user: raise Exception("User not found")
            
            if "name" in data:
                user.name = data["name"]
            if "avatarUrl" in data:
                avatar_data = data["avatarUrl"]
                if avatar_data and avatar_data.startswith("data:image"):
                    # Handle Cloudinary upload
                    try:
                        upload_result = cloudinary.uploader.upload(
                            avatar_data,
                            folder="dbms_platform/avatars",
                            public_id=f"user_{user_id}_{uuid.uuid4().hex[:8]}",
                            overwrite=True,
                            resource_type="image"
                        )
                        # Cloudinary returns the secure URL
                        user.avatarUrl = upload_result.get("secure_url")
                    except Exception as e:
                        print(f"Failed to upload to Cloudinary: {e}")
                        # Fallback for now - we could also raise an exception
                else:
                    user.avatarUrl = avatar_data
            if "bio" in data:
                user.bio = data["bio"]
            
            session.commit()
            return {
                "success": True, 
                "avatarUrl": user.avatarUrl,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "name": user.name,
                    "avatarUrl": user.avatarUrl,
                    "bio": user.bio
                }
            }
        finally:
            if session:
                session.close()

    def change_password(self, user_id, old_password, new_password):
        session = SessionLocal()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user: raise Exception("User not found")
            
            # Verify old password
            if not auth_service.verify_password(old_password, user.password):
                raise Exception("Current password incorrect")
            
            # Update password
            user.password = auth_service.get_password_hash(new_password)
            session.commit()
            return {"success": True}
        finally:
            if session:
                session.close()


    def get_settings(self, user_id):
        # Even for mock user, try to fetch from DB for persistence
        session = SessionLocal()
        try:
            # Check UserSetting
            setting = session.query(UserSetting).filter(UserSetting.userId == user_id).first()
            if setting:
                return setting.settings
            
            # Default settings if none exist
            if user_id == "desktop-admin-id":
                return {
                    "layout": "default",
                    "theme": "dark",
                    "editor": {"fontSize": 14}
                }
            return None
        finally:
            if session:
                session.close()

    def update_settings(self, user_id, settings_data):
        session = SessionLocal()
        try:
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
        finally:
            if session:
                session.close()



user_service = UserService()
