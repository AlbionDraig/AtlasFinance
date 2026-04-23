from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, hash_token, verify_password
from app.models.revoked_token import RevokedToken
from app.models.user import User
from app.schemas.user import UserCreate


def create_user(db: Session, payload: UserCreate) -> User:
    """Create a user account if the email is not already registered."""
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise ValueError("Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Validate credentials and return user on success, otherwise None."""
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def revoke_access_token(db: Session, token: str, expires_at: datetime) -> None:
    """Store a token hash in denylist until expiration."""
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    token_hash = hash_token(token)
    existing = db.scalar(select(RevokedToken).where(RevokedToken.token_hash == token_hash))
    if existing:
        return

    db.add(RevokedToken(token_hash=token_hash, expires_at=expires_at))
    db.commit()


def is_access_token_revoked(db: Session, token: str) -> bool:
    """Return True when token hash exists in denylist and is not expired."""
    now = datetime.now(timezone.utc)
    # Opportunistic cleanup keeps table small without scheduler dependency.
    db.execute(delete(RevokedToken).where(RevokedToken.expires_at < now))
    db.commit()

    token_hash = hash_token(token)
    revoked = db.scalar(select(RevokedToken).where(RevokedToken.token_hash == token_hash))
    if not revoked:
        return False

    expires_at = revoked.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at >= now
