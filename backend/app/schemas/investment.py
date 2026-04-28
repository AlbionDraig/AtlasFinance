from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Currency

INSTRUMENT_TYPES = ["Acciones", "Fondos", "Bonos", "CDT", "ETF", "Cripto", "Otro"]


class InvestmentCreate(BaseModel):
    """Payload used to register a new investment position."""
    name: str = Field(min_length=2, max_length=120)
    instrument_type: str = Field(min_length=2, max_length=120)
    amount_invested: Decimal = Field(gt=0)
    current_value: Decimal = Field(ge=0)
    currency: Currency
    bank_id: int
    started_at: datetime


class InvestmentUpdate(BaseModel):
    """Payload used to update an existing investment position."""
    name: str = Field(min_length=2, max_length=120)
    instrument_type: str = Field(min_length=2, max_length=120)
    current_value: Decimal = Field(ge=0)
    bank_id: int
    started_at: datetime


class InvestmentRead(BaseModel):
    """Serialized investment response exposed by the API."""
    id: int
    name: str
    instrument_type: str
    amount_invested: Decimal
    current_value: Decimal
    currency: Currency
    bank_id: int
    started_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})
