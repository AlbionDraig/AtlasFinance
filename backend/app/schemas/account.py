from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AccountType, Currency


class AccountCreate(BaseModel):
    """Payload used to create a bank account."""
    name: str = Field(min_length=2, max_length=120)
    account_type: AccountType
    currency: Currency
    current_balance: Decimal = Field(default=Decimal(0), ge=0)
    bank_id: int


class AccountUpdate(BaseModel):
    """Payload used to update a bank account."""
    name: str = Field(min_length=2, max_length=120)
    account_type: AccountType
    currency: Currency
    bank_id: int


class AccountRead(BaseModel):
    """Serialized account response exposed by the API."""
    id: int
    name: str
    account_type: AccountType
    currency: Currency
    current_balance: Decimal
    bank_id: int

    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})
