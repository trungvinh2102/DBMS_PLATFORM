"""
auth_service.py

Authentication service for handling user login, registration, and token management.
"""

import jwt
import datetime
import os
import uuid
import logging
from passlib.context import CryptContext
from models.metadata import User, Role
from utils.db_utils import with_session

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    """
    Handles user authentication logic.
    """
    def __init__(self):
        self.secret = os.getenv("JWT_SECRET", "secret")
        self.algorithm = "HS256"

    def verify_password(self, plain_password, hashed_password):
        """Verifies a plain password against its hashed version."""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password):
        """Generates a hash for a plain password."""
        return pwd_context.hash(password)

    def create_access_token(self, data: dict):
        """Creates a JWT access token."""
        to_encode = data.copy()
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret, algorithm=self.algorithm)
        return encoded_jwt

    @with_session
    def login(self, session, identifier, password):
        """Handles user login logic."""
        # Try username first, then email
        user = session.query(User).filter(
            (User.username == identifier) | (User.email == identifier)
        ).first()
        
        if not user or not self.verify_password(password, user.password):
            return None
        
        # Fetch role name (lazy load or join)
        role_name = user.role.name if user.role else "Default"
        
        token = self.create_access_token({
            "userId": user.id,
            "email": user.email,
            "role": role_name
        })
        
        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "name": user.name,
                "role": role_name
            }
        }

    @with_session
    def register(self, session, data):
        """Handles user registration logic."""
        # Check existing
        if session.query(User).filter((User.email == data['email']) | (User.username == data['username'])).first():
            raise Exception("User already exists")
        
        # Get default role
        default_role = session.query(Role).filter(Role.name == "Viewer").first()
        if not default_role:
             raise Exception("Default role not found")

        hashed_pw = self.get_password_hash(data['password'])
        
        new_user = User(
            id=str(uuid.uuid4()),
            email=data['email'],
            username=data['username'],
            password=hashed_pw,
            name=data.get('name'),
            roleId=default_role.id
        )
        
        session.add(new_user)
        session.commit()
        
        token = self.create_access_token({
            "userId": new_user.id,
            "email": new_user.email,
            "role": default_role.name
        })
        
        return {
            "token": token,
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "username": new_user.username,
                "name": new_user.name,
                "role": default_role.name
            }
        }

auth_service = AuthService()
