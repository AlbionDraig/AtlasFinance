"""Repositorio del agregado Pocket."""
from sqlalchemy import func, select

from app.models.account import Account
from app.models.bank import Bank
from app.models.pocket import Pocket
from app.repositories.base import BaseRepository


class PocketRepository(BaseRepository[Pocket]):
    """Queries específicas para bolsillos."""

    model = Pocket

    def get_owned(self, user_id: int, pocket_id: int) -> Pocket | None:
        """Recuperar un bolsillo solo si pertenece al usuario."""
        pocket = self.db.get(Pocket, pocket_id)
        if not pocket or pocket.account.bank.user_id != user_id:
            return None
        return pocket

    def list_by_user(self, user_id: int) -> list[Pocket]:
        """Listar todos los bolsillos del usuario."""
        query = (
            select(Pocket)
            .join(Account)
            .join(Bank)
            .where(Bank.user_id == user_id)
            .order_by(Pocket.created_at.desc())
        )
        return list(self.db.scalars(query).all())

    def find_duplicate_name(
        self,
        account_id: int,
        name: str,
        exclude_pocket_id: int | None = None,
    ) -> int | None:
        """Detectar si ya existe un bolsillo con el mismo nombre en la cuenta."""
        query = (
            select(Pocket.id)
            .where(
                Pocket.account_id == account_id,
                func.lower(Pocket.name) == name.lower(),
            )
            .limit(1)
        )
        if exclude_pocket_id is not None:
            query = query.where(Pocket.id != exclude_pocket_id)
        return self.db.scalar(query)
