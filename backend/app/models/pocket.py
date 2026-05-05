from datetime import datetime
from decimal import Decimal

from sqlalchemy import Enum, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.columns import created_at_column, required_fk_column
from app.models.enums import Currency


class Pocket(Base):
    """Sub-balance partition inside an account for specific goals."""
    __tablename__ = "pockets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    currency: Mapped[Currency] = mapped_column(Enum(Currency), nullable=False)
    account_id: Mapped[int] = required_fk_column("accounts.id")
    created_at: Mapped[datetime] = created_at_column()

    account = relationship("Account", back_populates="pockets")
    transactions = relationship("Transaction", back_populates="pocket")
