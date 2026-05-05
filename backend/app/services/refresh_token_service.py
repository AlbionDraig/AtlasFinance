"""Refresh token persistence + rotation with reuse detection."""
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.security import hash_token
from app.models.refresh_token import RefreshToken


def store_refresh_token(
    db: Session, user_id: int, token: str, expires_at: datetime
) -> RefreshToken:
    """Persiste el hash del refresh token con su user_id y expiración."""
    record = RefreshToken(
        user_id=user_id,
        token_hash=hash_token(token),
        expires_at=expires_at,
        revoked=False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def find_active_refresh_token(db: Session, token: str) -> RefreshToken | None:
    """Busca un refresh token por hash; sólo devuelve si NO está revocado y no expiró."""
    record = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(token))
    )
    if record is None:
        return None
    return record


def revoke_refresh_token(db: Session, record: RefreshToken) -> None:
    """Marca un único refresh token como revocado."""
    record.revoked = True
    db.commit()


def revoke_all_user_refresh_tokens(db: Session, user_id: int) -> None:
    """Revoca TODOS los refresh tokens del usuario (logout o reuso detectado)."""
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False))
        .values(revoked=True)
    )
    db.commit()


def is_expired(record: RefreshToken) -> bool:
    """Compara expiración respetando timezone-awareness.

    SQLite devuelve datetimes naive incluso con timezone=True; los normalizamos
    a UTC para una comparación segura cross-backend (Postgres devuelve aware).
    """
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < datetime.now(timezone.utc)
