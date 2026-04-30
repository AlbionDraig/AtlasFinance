"""Configuración centralizada de la aplicación.

Usamos pydantic-settings para que cada parámetro pueda sobreescribirse vía
variable de entorno o archivo .env, sin tocar código. `get_settings()` está
cacheado para evitar re-leer .env en cada request.
"""
import json
import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings tipados; los defaults son seguros para desarrollo local."""
    project_name: str = "Atlas Finance"
    api_v1_prefix: str = "/api/v1"
    # Default apunta al servicio Postgres del docker-compose; en CI/test se sobrescribe a SQLite.
    database_url: str = "postgresql+psycopg://atlas:atlas@db:5432/atlas_finance"

    # "development" | "test" | "production". Controla seeds y comportamientos defensivos.
    environment: str = "production"
    # Habilita la carga de datos demo al arrancar.
    # En development/test se activa automáticamente.
    # En production permanece False a menos que se establezca explícitamente para evitar contaminar datos reales.
    seed_demo_data: bool = False

    # IMPORTANTE: en producción DEBE inyectarse vía env var; el default solo evita crashes en dev.
    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    # Leídas con os.getenv para soportar override sin reiniciar pydantic settings cache.
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 120))
    refresh_token_expire_minutes: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", 1440))  # 1 día: balance entre UX y exposición.

    default_currency: str = "COP"
    # Rate limits por IP para endpoints sensibles (slowapi formato "N/segundos|minutos|hour").
    # Se desactivan en tests con rate_limit_enabled=False para no falsear assertions.
    rate_limit_enabled: bool = True
    rate_limit_login: str = "10/minute"
    rate_limit_register: str = "5/minute"
    rate_limit_refresh: str = "30/minute"

    # Observability — Sentry is opt-in. When sentry_dsn is empty (default) no
    # SDK is initialised and the dependency stays unused. Set SENTRY_DSN in
    # the environment of a production deployment to start capturing errors.
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.0
    sentry_profiles_sample_rate: float = 0.0
    # CSV con los orígenes permitidos por CORS. Se lista hosts de dev (Vite, Streamlit legacy)
    # para no bloquear el desarrollo local; en prod debe restringirse vía env var.
    backend_cors_origins: str = (
        "http://localhost:8502,"
        "http://127.0.0.1:8502,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    @property
    def backend_cors_origins_list(self) -> list[str]:
        """Parsea orígenes CORS desde CSV o JSON array.

        Aceptamos ambos formatos porque deployments de Docker/k8s suelen pasar
        listas como JSON (`["https://a","https://b"]`) mientras que entornos
        simples las pasan como CSV (`a,b`).
        """
        raw = self.backend_cors_origins.strip()
        if not raw:
            return []

        # Heurística: si arranca con '[' lo intentamos como JSON; si falla caemos al parser CSV.
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(origin).strip() for origin in parsed if str(origin).strip()]
            except json.JSONDecodeError:
                # No re-lanzamos: un JSON corrupto no debe tumbar el arranque; el fallback CSV es seguro.
                pass

        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    # extra="ignore" evita que .env con vars sobrantes (de otros servicios) rompa el arranque.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Devuelve la instancia de Settings cacheada (singleton de facto).

    El cache evita re-parsear .env en cada Depends(); para tests se puede
    invocar `get_settings.cache_clear()` antes de mutar variables de entorno.
    """
    return Settings()
