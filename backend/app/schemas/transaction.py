from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Currency, TransactionType


class TransactionCreate(BaseModel):
    """Payload used to create or update a transaction."""
    description: str = Field(min_length=2, max_length=255)
    amount: Decimal = Field(gt=0)
    currency: Currency
    transaction_type: TransactionType
    occurred_at: datetime
    account_id: int
    category_id: int | None = None
    pocket_id: int | None = None
    is_initial_balance: bool = False


class TransactionRead(BaseModel):
    """Serialized transaction response exposed by the API."""
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
