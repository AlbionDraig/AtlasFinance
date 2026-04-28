import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Response
from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_token(token: str) -> str:
    """Return SHA-256 hash for token revocation checks without storing raw JWT."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True when plain password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate a password hash using the configured passlib context."""
    return pwd_context.hash(password)


def create_access_token(subject: str | Any, expires_delta: timedelta | None = None, response: Response | None = None) -> str:
    """Create JWT access token and optionally attach it as a secure cookie.

    Uses environment-aware cookie flags so local development keeps working
    while production enforces secure transport.
    """
    settings = get_settings()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode = {"exp": expire, "sub": str(subject)}
    token = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

    # Keep the cookie HttpOnly and strict to reduce XSS/CSRF attack surface.
    if response:
        is_production = settings.environment == "production"
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=is_production,
            samesite="strict",
            max_age=settings.access_token_expire_minutes * 60
        )

    return token
