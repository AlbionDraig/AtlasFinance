from app.db.base import Base, engine
from app.models import account, bank, category, investment, pocket, revoked_token, transaction, user  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
