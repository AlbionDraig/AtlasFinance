from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """Payload used to register a new user."""
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=64)


class UserRead(BaseModel):
    """Public user representation returned by API responses."""
    id: int
    email: EmailStr
    full_name: str

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """Credentials payload used to authenticate users."""
    email: EmailStr
    password: str
