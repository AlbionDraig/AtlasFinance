"""Repositorio del agregado Bank."""
from sqlalchemy import select

from app.models.bank import Bank
from app.repositories.base import BaseRepository


class BankRepository(BaseRepository[Bank]):
    """Queries específicas para bancos."""

    model = Bank

    def list_by_user(self, user_id: int) -> list[Bank]:
        """Listar bancos de un usuario, los más recientes primero."""
        query = (
            select(Bank)
            .where(Bank.user_id == user_id)
            .order_by(Bank.created_at.desc())
        )
        return list(self.db.scalars(query).all())

    def get_owned(self, user_id: int, bank_id: int) -> Bank | None:
        """Recuperar un banco solo si pertenece al usuario."""
        bank = self.db.get(Bank, bank_id)
        if not bank or bank.user_id != user_id:
            return None
        return bank

    def list_by_country_code(self, country_code: str) -> list[Bank]:
        """Listar bancos asociados a un código de país (para propagar cambios)."""
        return list(
            self.db.scalars(select(Bank).where(Bank.country_code == country_code)).all()
        )

    def first_id_by_country_code(self, country_code: str) -> int | None:
        """ID de cualquier banco que use un código de país (para validar borrado)."""
        return self.db.scalar(
            select(Bank.id).where(Bank.country_code == country_code).limit(1)
        )
