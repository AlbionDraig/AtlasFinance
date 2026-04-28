from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import InvestmentEntityType


class InvestmentEntity(Base):
    """Institution that can host investments (bank, broker, exchange, etc.)."""
    __tablename__ = "investment_entities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[InvestmentEntityType] = mapped_column(Enum(InvestmentEntityType), nullable=False)
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

    user = relationship("User", back_populates="investment_entities")
    investments = relationship("Investment", back_populates="investment_entity", cascade="all, delete-orphan")
