"""Refresh token storage with rotation support.

Cada refresh token se guarda hasheado (nunca el JWT raw) con su user_id, fecha
de expiración y marca de revocación. El flujo de rotación garantiza que un
refresh token sólo es válido una vez: en cada `/refresh` se revoca el actual y
se emite uno nuevo. Si un atacante intenta reutilizar un token ya revocado,
el sistema revoca todos los refresh tokens del usuario afectado (sospecha de robo).
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RefreshToken(Base):
    """Refresh token persistido con rotación + detección de reuso."""

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # SHA-256 del JWT (64 hex). Usar hash impide leer el token desde la BD.
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    revoked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("FALSE"),
        default=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
