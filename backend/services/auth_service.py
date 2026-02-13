"""
backend/services/auth_service.py
Auth service for handling login and registration.
"""
import jwt
import datetime
import os
import uuid
import logging
from passlib.context import CryptContext
from models.metadata import User, Role, SessionLocal

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self):
        self.secret = os.getenv("JWT_SECRET", "secret")
        self.algorithm = "HS256"

    def verify_password(self, plain_password, hashed_password):
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password):
        return pwd_context.hash(password)

    def create_access_token(self, data: dict):
        to_encode = data.copy()
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret, algorithm=self.algorithm)
        return encoded_jwt

    def login(self, identifier, password):
        session = SessionLocal()
        try:
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
        finally:
            session.close()

    def register(self, data):
        session = SessionLocal()
        try:
            # Check existing
            if session.query(User).filter((User.email == data['email']) | (User.username == data['username'])).first():
                raise Exception("User already exists")
            
            # Get default role
            default_role = session.query(Role).filter(Role.name == "Default").first()
            if not default_role:
                 # Fallback if roles not seeded? Or create specific?
                 # ideally roles are seeded.
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
        finally:
            session.close()

auth_service = AuthService()
