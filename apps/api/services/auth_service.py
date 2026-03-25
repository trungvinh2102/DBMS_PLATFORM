"""
auth_service.py

Authentication service for handling user login, registration, and JWT token management.
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
import bcrypt

class AuthService:
    def __init__(self):
        self.secret = os.getenv("JWT_SECRET", "secret")
        self.algorithm = "HS256"

    def verify_password(self, plain_password, hashed_password):
        """
        Verifies the plain password against the hashed password using direct bcrypt call.
        Bypasses passlib logic to resolve length limitation errors.
        """
        try:
            if not plain_password or not hashed_password:
                return False
                
            # Convert both to bytes for bcrypt.checkpw
            p_bytes = plain_password.encode('utf-8')
            if len(p_bytes) > 72:
                 p_bytes = p_bytes[:72]
            
            h_bytes = hashed_password.encode('utf-8') if isinstance(hashed_password, str) else hashed_password
            
            # Direct checkpw call. It usually handles everything fine.
            return bcrypt.checkpw(p_bytes, h_bytes)
        except Exception as e:
            logger.error(f"Auth Service ERROR during verification: {e}")
            # If it's not a bcrypt hash, we should handle it gracefully
            return False

    def get_password_hash(self, password):
        """Hashes the password using direct bcrypt call."""
        if not password:
             password = ""
        
        p_bytes = password.encode('utf-8')
        if len(p_bytes) > 72:
            p_bytes = p_bytes[:72]
            
        # Standard bcrypt hashing
        salt = bcrypt.gensalt(12) # Rounds match the $2b$12$ in your DB
        hashed = bcrypt.hashpw(p_bytes, salt)
        return hashed.decode('utf-8')

    def create_access_token(self, data: dict):
        to_encode = data.copy()
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret, algorithm=self.algorithm)
        return encoded_jwt

    def login(self, identifier, password):
        print(f"Backend: Login attempt for '{identifier}', type(password)={type(password)}, len={len(password) if hasattr(password, '__len__') else 'N/A'}")
        session = SessionLocal()
        try:
            # Try username first, then email
            user = session.query(User).filter(
                (User.username == identifier) | (User.email == identifier)
            ).first()
            if not user:
                print(f"Backend: User '{identifier}' not found.")
                return None
            
            # Verify password
            if not self.verify_password(password, user.password):
                print(f"Backend: Password verify failed for '{identifier}'.")
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
