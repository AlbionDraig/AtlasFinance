import os
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "Atlas Finance"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://atlas:atlas@db:5432/atlas_finance"

    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 120))
    refresh_token_expire_minutes: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", 1440))  # 1 day

    exchange_rate_api_url: str = "https://api.exchangerate.host/"
    default_currency: str = "COP"
    backend_cors_origins: list[str] = [
        "http://localhost:8502",
        "http://127.0.0.1:8502",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
