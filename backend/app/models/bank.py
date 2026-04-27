from sqlalchemy import DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Bank(Base):
    """Financial institution container for user accounts and investments."""
    __tablename__ = "banks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    country_code: Mapped[str] = mapped_column(String(3), nullable=False, default="CO")
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[DateTime] = mapped_column(
        server_default=text("CURRENT_TIMESTAMP"),
        type_=DateTime(timezone=True),
    )

    user = relationship("User", back_populates="banks")
    accounts = relationship("Account", back_populates="bank", cascade="all, delete-orphan")
    investments = relationship("Investment", back_populates="bank", cascade="all, delete-orphan")
