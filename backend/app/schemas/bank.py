from pydantic import BaseModel, ConfigDict, Field


class BankCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    country_code: str = Field(default="CO", min_length=2, max_length=3)


class BankRead(BaseModel):
    id: int
    name: str
    country_code: str

    model_config = ConfigDict(from_attributes=True)
