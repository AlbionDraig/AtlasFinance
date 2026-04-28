from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Currency


class PocketCreate(BaseModel):
    """Payload used to create a pocket inside an account."""
    name: str = Field(min_length=2, max_length=120)
    balance: Decimal = Field(default=Decimal(0), ge=0)
    currency: Currency
    account_id: int


class PocketUpdate(BaseModel):
    """Payload used to update an existing pocket."""
    name: str = Field(min_length=2, max_length=120)
    account_id: int


class PocketMoveCreate(BaseModel):
    """Payload used to move funds from account balance into a pocket."""
    amount: Decimal = Field(gt=0)
    account_id: int
    pocket_id: int
    occurred_at: datetime


class PocketRead(BaseModel):
    """Serialized pocket response exposed by the API."""
    id: int
    name: str
    balance: Decimal
    currency: Currency
    account_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})
