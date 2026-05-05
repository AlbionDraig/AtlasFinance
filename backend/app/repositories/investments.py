"""Repositorio del agregado Investment."""
from sqlalchemy import select

from app.models.investment import Investment
from app.repositories.base import BaseRepository


class InvestmentRepository(BaseRepository[Investment]):
    """Queries específicas para inversiones."""

    model = Investment

    def get_owned(self, user_id: int, investment_id: int) -> Investment | None:
        """Recuperar una inversión solo si pertenece al usuario."""
        investment = self.db.get(Investment, investment_id)
        if not investment or investment.user_id != user_id:
            return None
        return investment

    def list_by_user(self, user_id: int) -> list[Investment]:
        """Listar inversiones del usuario por fecha de inicio descendente."""
        query = (
            select(Investment)
            .where(Investment.user_id == user_id)
            .order_by(Investment.started_at.desc())
        )
        return list(self.db.scalars(query).all())
