from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Currency


class PocketCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    balance: Decimal = Field(default=0, ge=0)
    currency: Currency
    account_id: int


class PocketRead(BaseModel):
    id: int
    name: str
    balance: Decimal
    currency: Currency
    account_id: int

    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})
