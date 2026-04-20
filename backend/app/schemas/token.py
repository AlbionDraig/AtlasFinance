from pydantic import BaseModel


class Token(BaseModel):
    """JWT access token payload returned by auth endpoints."""
    access_token: str
    token_type: str = "bearer"
