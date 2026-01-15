"""
Encryption service for the Journal Notes backend.

This module provides encryption and decryption capabilities for note data
using industry-standard cryptographic algorithms.
"""

import os
import base64
import hashlib
from typing import Union
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend


class EncryptionService:
    """Service for encrypting and decrypting data using AES-256-GCM."""
    
    def __init__(self):
        self.backend = default_backend()
    
    def _derive_key(self, password: str, salt: bytes) -> bytes:
        """
        Derive an encryption key from a password using PBKDF2.
        
        Args:
            password: The user's password
            salt: Random salt bytes
            
        Returns:
            32-byte encryption key
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256 bits
            salt=salt,
            iterations=100000,
            backend=self.backend
        )
        return kdf.derive(password.encode('utf-8'))
    
    def encrypt(self, data: str, password: str) -> str:
        """
        Encrypt data using AES-256-GCM.
        
        Args:
            data: The plaintext data to encrypt
            password: The encryption password
            
        Returns:
            Base64-encoded encrypted data (salt + nonce + ciphertext + tag)
        """
        # Generate random salt and nonce
        salt = os.urandom(16)  # 128 bits
        nonce = os.urandom(12)  # 96 bits for GCM
        
        # Derive key from password
        key = self._derive_key(password, salt)
        
        # Encrypt the data
        cipher = Cipher(algorithms.AES(key), modes.GCM(nonce), backend=self.backend)
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(data.encode('utf-8')) + encryptor.finalize()
        
        # Combine salt + nonce + ciphertext + tag
        encrypted_data = salt + nonce + ciphertext + encryptor.tag
        
        # Return base64-encoded result
        return base64.b64encode(encrypted_data).decode('utf-8')
    
    def decrypt(self, encrypted_data: str, password: str) -> str:
        """
        Decrypt data using AES-256-GCM.
        
        Args:
            encrypted_data: Base64-encoded encrypted data
            password: The decryption password
            
        Returns:
            The decrypted plaintext data
            
        Raises:
            ValueError: If decryption fails (wrong password or corrupted data)
        """
        try:
            # Decode from base64
            data = base64.b64decode(encrypted_data.encode('utf-8'))
            
            # Extract components
            salt = data[:16]
            nonce = data[16:28]
            ciphertext = data[28:-16]
            tag = data[-16:]
            
            # Derive key from password
            key = self._derive_key(password, salt)
            
            # Decrypt the data
            cipher = Cipher(algorithms.AES(key), modes.GCM(nonce, tag), backend=self.backend)
            decryptor = cipher.decryptor()
            plaintext = decryptor.update(ciphertext) + decryptor.finalize()
            
            return plaintext.decode('utf-8')
            
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}") from e