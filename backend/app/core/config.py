import os
import json
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "Atlas Finance"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://atlas:atlas@db:5432/atlas_finance"

    # "development" | "test" | "production"
    environment: str = "production"
    # Carga datos demo al arrancar. Se activa automáticamente cuando environment != "production"
    seed_on_startup: bool = False

    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 120))
    refresh_token_expire_minutes: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", 1440))  # 1 day

    default_currency: str = "COP"
    backend_cors_origins: str = (
        "http://localhost:8502,"
        "http://127.0.0.1:8502,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    @property
    def backend_cors_origins_list(self) -> list[str]:
        """Parse CORS origins from CSV or JSON array env values."""
        raw = self.backend_cors_origins.strip()
        if not raw:
            return []

        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(origin).strip() for origin in parsed if str(origin).strip()]
            except json.JSONDecodeError:
                pass

        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
