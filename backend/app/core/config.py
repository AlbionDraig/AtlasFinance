from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "Atlas Finance"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://atlas:atlas@db:5432/atlas_finance"

    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    exchange_rate_api_url: str = "https://api.exchangerate.host/"
    default_currency: str = "COP"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
