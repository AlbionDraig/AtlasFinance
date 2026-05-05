"""Repositorio del agregado Account."""
from sqlalchemy import select

from app.models.account import Account
from app.models.bank import Bank
from app.models.enums import AccountType, Currency
from app.repositories.base import BaseRepository


class AccountRepository(BaseRepository[Account]):
    """Queries específicas para cuentas."""

    model = Account

    def get_owned(self, user_id: int, account_id: int) -> Account | None:
        """Recuperar una cuenta solo si pertenece al usuario (a través del banco)."""
        account = self.db.get(Account, account_id)
        if not account or account.bank.user_id != user_id:
            return None
        return account

    def list_by_user(
        self,
        user_id: int,
        search: str | None = None,
        account_type: AccountType | None = None,
        currency: Currency | None = None,
        bank_id: int | None = None,
    ) -> list[Account]:
        """Listar cuentas del usuario aplicando filtros opcionales."""
        query = select(Account).join(Bank).where(Bank.user_id == user_id)
        if search:
            term = f"%{search}%"
            query = query.where(Account.name.ilike(term) | Bank.name.ilike(term))
        if account_type is not None:
            query = query.where(Account.account_type == account_type)
        if currency is not None:
            query = query.where(Account.currency == currency)
        if bank_id is not None:
            query = query.where(Account.bank_id == bank_id)
        query = query.order_by(Account.created_at.desc())
        return list(self.db.scalars(query).all())

    def list_all_by_user(self, user_id: int) -> list[Account]:
        """Listar todas las cuentas del usuario sin filtros (uso interno: métricas)."""
        return list(
            self.db.scalars(
                select(Account).join(Bank).where(Bank.user_id == user_id)
            ).all()
        )
