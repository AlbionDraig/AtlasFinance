"""Schemas for Budget endpoints."""
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import MoneyDecimal


class BudgetCreate(BaseModel):
    """Payload used to create a monthly budget for a category."""
    category_id: int = Field(gt=0)
    year: int = Field(ge=2020, le=2100)
    month: int = Field(ge=1, le=12)
    amount_limit: Decimal = Field(gt=0, decimal_places=2)


class BudgetUpdate(BaseModel):
    """Payload used to update a budget."""
    amount_limit: Decimal = Field(gt=0, decimal_places=2)


class BudgetRead(BaseModel):
    """Serialized budget response with current spending info."""
    id: int
    category_id: int
    year: int
    month: int
    amount_limit: MoneyDecimal
    current_spent: MoneyDecimal = Field(default=Decimal(0))
    remaining: MoneyDecimal = Field(default=Decimal(0))
    status: str = Field(default="ok")  # "ok", "warning", "exceeded"

    model_config = ConfigDict(from_attributes=True)


class BudgetListResponse(BaseModel):
    """List of budgets for a given month."""
    year: int
    month: int
    budgets: list[BudgetRead]
    total_limit: MoneyDecimal = Field(default=Decimal(0))
    total_spent: MoneyDecimal = Field(default=Decimal(0))
