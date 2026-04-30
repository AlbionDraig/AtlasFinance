"""Repositorio del agregado Country (catálogo global)."""
from sqlalchemy import func, select

from app.models.country import Country
from app.repositories.base import BaseRepository


class CountryRepository(BaseRepository[Country]):
    """Queries específicas para países globales."""

    model = Country

    def list_all(self) -> list[Country]:
        """Listar países ordenados por nombre."""
        query = select(Country).order_by(Country.name.asc())
        return list(self.db.scalars(query).all())

    def find_id_by_code(
        self, code: str, exclude_id: int | None = None
    ) -> int | None:
        """Buscar el ID de un país por código (con exclusión opcional)."""
        query = select(Country.id).where(Country.code == code).limit(1)
        if exclude_id is not None:
            query = query.where(Country.id != exclude_id)
        return self.db.scalar(query)

    def find_id_by_name(
        self, name: str, exclude_id: int | None = None
    ) -> int | None:
        """Buscar el ID de un país por nombre (case-insensitive)."""
        query = (
            select(Country.id)
            .where(func.lower(Country.name) == name.lower())
            .limit(1)
        )
        if exclude_id is not None:
            query = query.where(Country.id != exclude_id)
        return self.db.scalar(query)

    def code_exists(self, code: str) -> bool:
        """Saber si existe un país con un código dado (catálogo global)."""
        return self.find_id_by_code(code) is not None
