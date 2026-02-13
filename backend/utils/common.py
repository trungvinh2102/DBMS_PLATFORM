"""
common.py

Utility functions for configuration masking and encryption wrappers.
"""

from utils.crypto import encrypt, decrypt
import re

def mask_config(config: dict) -> dict:
    """
    Mask sensitive information in database configuration.
    
    Args:
        config (dict): The database configuration dictionary.
        
    Returns:
        dict: A new dictionary with sensitive fields masked.
    """
    if not config or not isinstance(config, dict):
        return config
    
    masked = config.copy()
    if 'password' in masked:
        masked['password'] = '********'
        
    if 'uri' in masked and isinstance(masked['uri'], str):
        # Mask password in URI: protocol://user:pass@host -> protocol://user:****@host
        masked['uri'] = re.sub(r'(://.*:)(.*)(@.*)', r'\1****\3', masked['uri'])
        
    return masked

def decrypt_uri(uri: str) -> str:
    """
    Decrypts a URI if it is encrypted.
    
    Args:
        uri (str): The potentially encrypted URI.
        
    Returns:
        str: The decrypted URI, or the original if decryption fails.
    """
    try:
        return decrypt(uri)
    except:
        return uri

def encrypt_uri(uri: str) -> str:
    """
    Encrypts a URI if it is not already encrypted.
    
    Args:
        uri (str): The URI string.
        
    Returns:
        str: The encrypted URI string.
    """
    if not uri: 
        return uri
    # Simple check if already encrypted (iv:ciphertext format expectation)
    # IV is 16 bytes = 32 hex chars usually. Loosely check for colon.
    if ":" in uri and len(uri.split(":")[0]) == 32: 
            return uri
    return encrypt(uri)
