from app.db.base import Base, engine
from app.models import (  # noqa: F401
    account,
    bank,
    category,
    investment,
    pocket,
    revoked_token,
    transaction,
    user,
)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
