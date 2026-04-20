from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AccountType, Currency


class AccountCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    account_type: AccountType
    currency: Currency
    current_balance: Decimal = Field(default=Decimal(0), ge=0)
    bank_id: int


class AccountRead(BaseModel):
    id: int
    name: str
    account_type: AccountType
    currency: Currency
    current_balance: Decimal
    bank_id: int

    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})
