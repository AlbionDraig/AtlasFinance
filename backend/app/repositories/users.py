"""Repositorio del agregado User."""
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Operaciones de persistencia sobre usuarios."""

    model = User

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def get_by_email(self, email: str) -> User | None:
        """Buscar usuario por email exacto."""
        return self.db.query(User).filter(User.email == email).first()
