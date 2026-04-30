from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.correlation import CorrelationIdMiddleware
from app.core.logging import configure_logging
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.core.security_headers import SecurityHeadersMiddleware
from app.db.base import get_db
from app.db.init_db import init_db
from app.db.seed import seed_base, seed_demo

settings = get_settings()
configure_logging()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Inicializar BD y catálogos durante el arranque de la app.

    seed_base  — siempre se ejecuta (países + catálogo de categorías).
    seed_demo  — solo en entornos no productivos o si SEED_DEMO_DATA=true.

    Reemplaza al hook deprecado ``@app.on_event("startup")`` por el patrón
    ``lifespan`` recomendado en FastAPI 0.110+.
    """
    init_db()
    seed_base()
    if settings.seed_demo_data or settings.environment != "production":
        seed_demo()
    yield


app = FastAPI(
    title=settings.project_name,
    version="0.1.0",
    description="Atlas Finance API for personal financial management.",
    lifespan=lifespan,
)

# slowapi se registra como state + middleware + handler.
# Los decoradores @limiter.limit(...) en rutas leen request.app.state.limiter.
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Cabeceras de seguridad: HSTS solo si el despliegue está bajo TLS (production).
app.add_middleware(SecurityHeadersMiddleware, hsts=settings.environment == "production")

# Correlation ID + structured access log: debe envolver al resto para que
# todos los logs internos hereden el contextvar correlation_id.
app.add_middleware(CorrelationIdMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def healthcheck() -> dict[str, str]:
    """Return lightweight liveness payload for health probes."""
    return {"status": "ok"}


@app.get("/ready", tags=["system"])
def readiness(db: Annotated[Session, Depends(get_db)]) -> dict[str, str]:
    """Readiness probe: verifica conectividad real con la BD.

    Diferencia clave vs `/health`:
    - liveness (/health): ¿el proceso responde? Si falla, k8s reinicia el pod.
    - readiness (/ready): ¿puede atender tráfico? Si falla, k8s lo saca del LB.
    """
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=503, detail=f"DB unavailable: {exc}") from exc
    return {"status": "ready"}


app.include_router(api_router, prefix=settings.api_v1_prefix)

