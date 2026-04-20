from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Currency, TransactionType


class TransactionCreate(BaseModel):
    description: str = Field(min_length=2, max_length=255)
    amount: Decimal = Field(gt=0)
    currency: Currency
    transaction_type: TransactionType
    occurred_at: datetime
    account_id: int
    category_id: int | None = None
    pocket_id: int | None = None


class TransactionRead(BaseModel):
    id: int
    description: str
    amount: Decimal
    currency: Currency
    transaction_type: TransactionType
    occurred_at: datetime
    account_id: int
    category_id: int | None
    pocket_id: int | None

    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})
