from decimal import Decimal

from sqlalchemy import DateTime, Enum, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.columns import created_at_column, required_fk_column
from app.models.enums import AccountType, Currency


class Account(Base):
    """Bank account used as source of balances and transactions."""
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    account_type: Mapped[AccountType] = mapped_column(Enum(AccountType), nullable=False)
    currency: Mapped[Currency] = mapped_column(Enum(Currency), nullable=False)
    current_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    bank_id: Mapped[int] = required_fk_column("banks.id")
    created_at: Mapped[DateTime] = created_at_column()

    bank = relationship("Bank", back_populates="accounts")
    pockets = relationship(
        "Pocket",
        back_populates="account",
        cascade="all, delete-orphan",
    )
    transactions = relationship(
        "Transaction",
        back_populates="account",
        cascade="all, delete-orphan",
    )
