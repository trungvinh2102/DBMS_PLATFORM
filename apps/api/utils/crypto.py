import hashlib
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

# Configuration from environment or defaults matching Node.js implementation
ENV_SECRET = os.getenv("JWT_SECRET", "fallback-secret-key-must-be-secure")

def get_key(secret: str) -> bytes:
    # Node default for scryptSync: N=16384, r=8, p=1
    return hashlib.scrypt(secret.encode(), salt=b"salt", n=16384, r=8, p=1, dklen=32)

def encrypt(text: str, secret: str = None) -> str:
    if secret is None:
        secret = ENV_SECRET
    
    key = get_key(secret)
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    # Pad to block size (16 bytes) using PKCS7
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(text.encode()) + padder.finalize()
    
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    return iv.hex() + ":" + ciphertext.hex()

def decrypt(encrypted_text: str, secret: str = None) -> str:
    if secret is None:
        secret = ENV_SECRET
        
    parts = encrypted_text.split(":")
    if len(parts) != 2:
        raise ValueError("Invalid encrypted text format")
        
    iv = bytes.fromhex(parts[0])
    ciphertext = bytes.fromhex(parts[1])
    
    key = get_key(secret)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    
    padded_data = decryptor.update(ciphertext) + decryptor.finalize()
    
    # Unpad
    unpadder = padding.PKCS7(128).unpadder()
    data = unpadder.update(padded_data) + unpadder.finalize()
    
    return data.decode()
