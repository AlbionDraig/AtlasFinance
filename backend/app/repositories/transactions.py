"""Repositorio del agregado Transaction."""
from datetime import datetime

from sqlalchemy import select

from app.models.enums import Currency, TransactionType
from app.models.transaction import Transaction
from app.repositories.base import BaseRepository


class TransactionRepository(BaseRepository[Transaction]):
    """Queries específicas para transacciones."""

    model = Transaction

    def get_owned(self, user_id: int, transaction_id: int) -> Transaction | None:
        """Recuperar una transacción solo si pertenece al usuario."""
        txn = self.db.get(Transaction, transaction_id)
        if not txn or txn.user_id != user_id:
            return None
        return txn

    def first_id_for_account(self, user_id: int, account_id: int) -> int | None:
        """ID de cualquier transacción existente en una cuenta del usuario.

        Se usa para validar que el saldo inicial solo se registre una vez.
        """
        return self.db.scalar(
            select(Transaction.id)
            .where(
                Transaction.user_id == user_id,
                Transaction.account_id == account_id,
            )
            .limit(1)
        )

    def find_mirror_transfer_id(self, txn: Transaction) -> int | None:
        """Buscar la transacción espejo de una transferencia.

        Las transferencias se persisten como pares gasto/ingreso con misma
        metadata; esta consulta encuentra el contrapeso para detectar el par.
        """
        opposite_type = (
            TransactionType.INCOME
            if txn.transaction_type == TransactionType.EXPENSE
            else TransactionType.EXPENSE
        )
        return self.db.scalar(
            select(Transaction.id)
            .where(
                Transaction.user_id == txn.user_id,
                Transaction.id != txn.id,
                Transaction.amount == txn.amount,
                Transaction.currency == txn.currency,
                Transaction.occurred_at == txn.occurred_at,
                Transaction.description == txn.description,
                Transaction.transaction_type == opposite_type,
                Transaction.account_id != txn.account_id,
            )
            .limit(1)
        )

    def list_by_user(  # pylint: disable=too-many-arguments
        self,
        user_id: int,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        account_id: int | None = None,
        transaction_type: TransactionType | None = None,
        currency: Currency | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 500,
    ) -> list[Transaction]:
        """Listar transacciones de un usuario con filtros opcionales."""
        query = select(Transaction).where(Transaction.user_id == user_id)
        if start_date:
            query = query.where(Transaction.occurred_at >= start_date)
        if end_date:
            query = query.where(Transaction.occurred_at <= end_date)
        if account_id is not None:
            query = query.where(Transaction.account_id == account_id)
        if transaction_type is not None:
            query = query.where(Transaction.transaction_type == transaction_type)
        if currency is not None:
            query = query.where(Transaction.currency == currency)
        if search:
            query = query.where(Transaction.description.ilike(f"%{search}%"))
        query = (
            query.order_by(Transaction.occurred_at.desc()).offset(skip).limit(limit)
        )
        return list(self.db.scalars(query).all())

    def list_all_by_user(self, user_id: int) -> list[Transaction]:
        """Recuperar todas las transacciones del usuario (uso en métricas)."""
        return list(
            self.db.scalars(
                select(Transaction).where(Transaction.user_id == user_id)
            ).all()
        )

    def add_pending(self, instance: Transaction) -> None:
        """Añadir sin commit; permite agruparlo con otros cambios atómicos."""
        self.db.add(instance)
