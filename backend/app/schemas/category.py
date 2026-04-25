from pydantic import BaseModel, ConfigDict, Field


class CategoryCreate(BaseModel):
    """Payload used to create a custom transaction category."""
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(
        default=None,
        description="Human-readable description shown in the UI to guide category selection.",
    )
    is_fixed: bool = False


class CategoryUpdate(BaseModel):
    """Partial update payload for a category."""
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    is_fixed: bool | None = None


class CategoryRead(BaseModel):
    """Serialized category response exposed by the API."""
    id: int
    name: str
    description: str | None = None
    is_fixed: bool = False

    model_config = ConfigDict(from_attributes=True)
