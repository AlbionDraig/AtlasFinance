from pydantic import BaseModel, ConfigDict, Field


class BankCreate(BaseModel):
    """Payload used to create a bank entity."""
    name: str = Field(min_length=2, max_length=120)
    country_code: str = Field(default="CO", min_length=2, max_length=3)


class BankUpdate(BaseModel):
    """Payload used to update a bank entity."""
    name: str = Field(min_length=2, max_length=120)
    country_code: str = Field(min_length=2, max_length=3)


class BankRead(BaseModel):
    """Serialized bank response exposed by the API."""
    id: int
    name: str
    country_code: str

    model_config = ConfigDict(from_attributes=True)
