from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import UserRole

CASCADE_DELETE = "all, delete-orphan"


class User(Base):
    """Application user with ownership over financial resources."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda enum: [member.value for member in enum]),
        nullable=False,
        default=UserRole.USER,
        server_default=UserRole.USER.value,
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
    )

    banks = relationship("Bank", back_populates="user", cascade=CASCADE_DELETE)
    transactions = relationship("Transaction", back_populates="user", cascade=CASCADE_DELETE)
    investments = relationship("Investment", back_populates="user", cascade=CASCADE_DELETE)
    investment_entities = relationship("InvestmentEntity", back_populates="user", cascade=CASCADE_DELETE)
