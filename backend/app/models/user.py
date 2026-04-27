from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

CASCADE_DELETE = "all, delete-orphan"


class User(Base):
    """Application user with ownership over financial resources."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    banks = relationship("Bank", back_populates="user", cascade=CASCADE_DELETE)
    transactions = relationship("Transaction", back_populates="user", cascade=CASCADE_DELETE)
    investments = relationship("Investment", back_populates="user", cascade=CASCADE_DELETE)
