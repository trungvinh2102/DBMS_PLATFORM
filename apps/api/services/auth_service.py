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
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self):
        self.secret = os.getenv("JWT_SECRET", "secret")
        self.algorithm = "HS256"

    def verify_password(self, plain_password, hashed_password):
        # bcrypt has a 72-byte limit. We truncate to ensure compliance.
        try:
            if not plain_password:
                return False
            
            # Ensure we have bytes for measurement
            if isinstance(plain_password, str):
                p_bytes = plain_password.encode('utf-8')
            else:
                p_bytes = plain_password
            
            # Truncate to exactly 72 bytes
            truncated_bytes = p_bytes[:72]
            safe_str = truncated_bytes.decode('utf-8', errors='ignore')
            
            # Diagnostic for debugging in desktop app
            print(f"Auth Service: Verifying password (input_len={len(p_bytes)}, truncated_len={len(truncated_bytes)}, is_str={isinstance(safe_str, str)})")
            
            # Call passlib/bcrypt. It should be happy with a string of up to 72 bytes
            return pwd_context.verify(safe_str, hashed_password)
        except Exception as e:
            # Diagnostic: include lengths in error to see if truncation actually happened
            p_len = len(plain_password) if plain_password else 0
            # If the user sees this prefix, they ARE running this updated code.
            raise Exception(f"Auth verification error [len={p_len}]: {str(e)}")

    def get_password_hash(self, password):
        # bcrypt has a 72-byte limit.
        if not password:
             return pwd_context.hash("")
        
        # Ensure bytes and truncate
        if isinstance(password, str):
            p_bytes = password.encode('utf-8')
        else:
            p_bytes = password
            
        truncated_bytes = p_bytes[:72]
        safe_str = truncated_bytes.decode('utf-8', errors='ignore')
        print(f"Auth Service: Hashing password (input_len={len(p_bytes)}, truncated_len={len(truncated_bytes)}, is_str={isinstance(safe_str, str)})")
        return pwd_context.hash(safe_str)

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
