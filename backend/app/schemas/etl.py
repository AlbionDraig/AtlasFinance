from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import Currency, TransactionType


class IngestionResult(BaseModel):
    total_rows: int
    imported_rows: int
    skipped_rows: int


class NormalizedTransaction(BaseModel):
    description: str
    amount: Decimal
    transaction_type: TransactionType
    occurred_at: datetime
    currency: Currency
    category: str
