from pydantic import BaseModel, ConfigDict, Field


class CountryCreate(BaseModel):
    """Payload used to create a country entry."""
    code: str = Field(min_length=2, max_length=3)
    name: str = Field(min_length=2, max_length=120)


class CountryUpdate(BaseModel):
    """Partial update payload for a country."""
    code: str | None = Field(default=None, min_length=2, max_length=3)
    name: str | None = Field(default=None, min_length=2, max_length=120)


class CountryRead(BaseModel):
    """Serialized country response exposed by the API."""
    id: int
    code: str
    name: str

    model_config = ConfigDict(from_attributes=True)