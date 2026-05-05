"""Repositorio del agregado Category (catálogo global)."""
from sqlalchemy import select

from app.models.category import Category
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    """Queries específicas para categorías globales."""

    model = Category

    def list_all(self) -> list[Category]:
        """Listar todas las categorías por fecha de creación descendente."""
        query = select(Category).order_by(Category.created_at.desc())
        return list(self.db.scalars(query).all())

    def list_by_ids(self, ids: set[int]) -> list[Category]:
        """Recuperar varias categorías por sus IDs (uso en agregados de dashboard)."""
        if not ids:
            return []
        return list(self.db.scalars(select(Category).where(Category.id.in_(ids))).all())
