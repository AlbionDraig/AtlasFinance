from pydantic import BaseModel, ConfigDict, Field


class CategoryCreate(BaseModel):
    """Payload used to create a custom transaction category."""
    name: str = Field(min_length=2, max_length=120)
    is_fixed: bool = False


class CategoryRead(BaseModel):
    """Serialized category response exposed by the API."""
    id: int
    name: str
    is_fixed: bool

    model_config = ConfigDict(from_attributes=True)
