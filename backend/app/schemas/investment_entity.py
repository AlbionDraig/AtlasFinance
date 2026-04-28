from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import InvestmentEntityType


class InvestmentEntityCreate(BaseModel):
    """Payload used to create an investment entity."""
    name: str = Field(min_length=2, max_length=120)
    entity_type: InvestmentEntityType
    country_code: str = Field(default="CO", min_length=2, max_length=3)


class InvestmentEntityUpdate(BaseModel):
    """Payload used to update an investment entity."""
    name: str = Field(min_length=2, max_length=120)
    entity_type: InvestmentEntityType
    country_code: str = Field(min_length=2, max_length=3)


class InvestmentEntityRead(BaseModel):
    """Serialized investment entity response exposed by the API."""
    id: int
    name: str
    entity_type: InvestmentEntityType
    country_code: str

    model_config = ConfigDict(from_attributes=True)
