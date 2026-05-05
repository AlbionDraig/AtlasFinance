from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base shared by every SQLAlchemy model."""


def get_db() -> Iterator[Session]:
    """Yield SQLAlchemy session and guarantee close after request lifecycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
