"""Repositorio del agregado InvestmentEntity."""
from sqlalchemy import select

from app.models.investment_entity import InvestmentEntity
from app.repositories.base import BaseRepository


class InvestmentEntityRepository(BaseRepository[InvestmentEntity]):
    """Queries específicas para entidades de inversión."""

    model = InvestmentEntity

    def get_owned(
        self, user_id: int, investment_entity_id: int
    ) -> InvestmentEntity | None:
        """Recuperar una entidad solo si pertenece al usuario."""
        entity = self.db.get(InvestmentEntity, investment_entity_id)
        if not entity or entity.user_id != user_id:
            return None
        return entity

    def list_by_user(self, user_id: int) -> list[InvestmentEntity]:
        """Listar entidades del usuario, las más recientes primero."""
        query = (
            select(InvestmentEntity)
            .where(InvestmentEntity.user_id == user_id)
            .order_by(InvestmentEntity.created_at.desc())
        )
        return list(self.db.scalars(query).all())
