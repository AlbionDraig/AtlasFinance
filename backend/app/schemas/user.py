import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _validate_password_strength(value: str) -> str:
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one number")
    if not re.search(r"[^A-Za-z0-9]", value):
        raise ValueError("Password must contain at least one special character")
    return value


class UserCreate(BaseModel):
    """Payload used to register a new user."""
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=64)

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        return _validate_password_strength(value)


class UserRead(BaseModel):
    """Public user representation returned by API responses."""
    id: int
    email: EmailStr
    full_name: str

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    """Fields the user may update on their own profile."""
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=8, max_length=64)

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, value: str | None) -> str | None:
        if value is not None:
            return _validate_password_strength(value)
        return value


class UserLogin(BaseModel):
    """Credentials payload used to authenticate users."""
    email: EmailStr
    password: str
