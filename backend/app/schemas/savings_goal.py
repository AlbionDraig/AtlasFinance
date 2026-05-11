"""Schemas for SavingsGoal endpoints."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import MoneyDecimal


class SavingsGoalCreate(BaseModel):
    """Payload used to create a savings goal."""
    name: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    target_amount: Decimal = Field(gt=0, decimal_places=2)
    target_date: datetime


class SavingsGoalUpdate(BaseModel):
    """Payload used to update a savings goal."""
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    target_amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    current_amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    target_date: datetime | None = None


class SavingsGoalRead(BaseModel):
    """Serialized savings goal response with progress info."""
    id: int
    name: str
    description: str | None
    target_amount: MoneyDecimal
    current_amount: MoneyDecimal
    target_date: datetime
    progress_percent: float = Field(default=0.0, ge=0, le=100)
    days_remaining: int = Field(default=0, ge=0)
    is_completed: bool = False

    model_config = ConfigDict(from_attributes=True)


class SavingsGoalScenarioRequest(BaseModel):
    """Request to simulate impact of category spending reduction on savings goals."""
    category_id: int = Field(gt=0)
    reduction_percent: float = Field(ge=0, le=100, description="Percentage to reduce spending by (0-100)")
    months_ahead: int = Field(ge=1, le=60, description="How many months to simulate")


class SavingsGoalScenarioResponse(BaseModel):
    """Simulated impact of spending reduction on savings goals."""
    goal_id: int
    goal_name: str
    current_amount: MoneyDecimal
    projected_amount: MoneyDecimal
    target_amount: MoneyDecimal
    projected_progress_percent: float
    will_reach_target: bool
    days_to_target: int | None = None
