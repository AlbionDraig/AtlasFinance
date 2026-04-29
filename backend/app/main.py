from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.init_db import init_db
from app.db.seed import seed_base, seed_demo

settings = get_settings()

app = FastAPI(
    title=settings.project_name,
    version="0.1.0",
    description="Atlas Finance API for personal financial management.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    """Initialize database and seed data during app startup.

    seed_base  — always runs (countries + categories catalog).
    seed_demo  — runs only in non-production or when SEED_DEMO_DATA=true.
    """
    init_db()
    seed_base()
    if settings.seed_demo_data or settings.environment != "production":
        seed_demo()


@app.get("/health", tags=["system"])
def healthcheck() -> dict[str, str]:
    """Return lightweight liveness payload for health probes."""
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.api_v1_prefix)
