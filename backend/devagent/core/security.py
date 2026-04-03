from __future__ import annotations

import base64
import json

from cryptography.fernet import Fernet


def generate_key(secret: str) -> bytes:
    """Derive a Fernet key from the app secret key (must be 32+ chars)."""
    key_bytes = secret.encode()[:32].ljust(32, b"\0")
    return base64.urlsafe_b64encode(key_bytes)


def encrypt_data(data: dict, secret: str) -> str:
    """Encrypt a dict to a Fernet token string."""
    f = Fernet(generate_key(secret))
    return f.encrypt(json.dumps(data).encode()).decode()


def decrypt_data(token: str, secret: str) -> dict:
    """Decrypt a Fernet token string back to a dict."""
    f = Fernet(generate_key(secret))
    return json.loads(f.decrypt(token.encode()))
