"""Movimientos: registro, edición, eliminación, transferencias y listados."""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.category import Category
from app.models.enums import Currency, TransactionType
from app.models.pocket import Pocket
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransferCreate
from app.services._common import (
    apply_transaction_effect,
    commit_and_refresh,
    ensure_sufficient_funds,
    invalidate_metrics_cache,
    revert_transaction_effect,
)


def _validate_transaction_payload(
    db: Session, user_id: int, payload: TransactionCreate
) -> Account:
    """Validar relaciones de propiedad y devolver la cuenta destino."""
    account = db.get(Account, payload.account_id)
    if not account or account.bank.user_id != user_id:
        raise ValueError("Invalid account for user")

    if payload.pocket_id:
        pocket = db.get(Pocket, payload.pocket_id)
        if not pocket or pocket.account_id != payload.account_id:
            raise ValueError("Pocket does not belong to account")

    if payload.category_id:
        category = db.get(Category, payload.category_id)
        if not category:
            raise ValueError("Invalid category")

    return account


def _is_transfer_transaction(db: Session, txn: Transaction) -> bool:
    """Detectar pares de transferencias para impedir su edición directa.

    Las transferencias se persisten como dos transacciones espejo (gasto/ingreso)
    con misma metadata y tipo opuesto.
    """
    if not txn.description.startswith("Transferencia: "):
        return False

    opposite_type = (
        TransactionType.INCOME
        if txn.transaction_type == TransactionType.EXPENSE
        else TransactionType.EXPENSE
    )
    mirrored_tx_id = db.scalar(
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
    return mirrored_tx_id is not None


def register_transaction(
    db: Session, user_id: int, payload: TransactionCreate
) -> Transaction:
    """Crear una transacción y actualizar el saldo de la cuenta."""
    account = _validate_transaction_payload(db, user_id, payload)

    if payload.is_initial_balance:
        existing_tx = db.scalar(
            select(Transaction.id)
            .where(
                Transaction.user_id == user_id,
                Transaction.account_id == payload.account_id,
            )
            .limit(1)
        )
        if existing_tx is not None:
            raise ValueError(
                "Initial balance can only be registered once per account."
            )

    ensure_sufficient_funds(account, payload.transaction_type, payload.amount)

    txn = Transaction(
        description=payload.description,
        amount=payload.amount,
        currency=payload.currency,
        transaction_type=payload.transaction_type,
        occurred_at=payload.occurred_at,
        user_id=user_id,
        account_id=payload.account_id,
        category_id=payload.category_id,
        pocket_id=payload.pocket_id,
    )
    db.add(txn)

    apply_transaction_effect(account, payload.transaction_type, payload.amount)

    created_txn = commit_and_refresh(db, txn)
    invalidate_metrics_cache(user_id)
    return created_txn


def update_transaction(
    db: Session,
    user_id: int,
    transaction_id: int,
    payload: TransactionCreate,
) -> Transaction:
    """Actualizar una transacción y mantener saldos consistentes."""
    txn = db.get(Transaction, transaction_id)
    if not txn or txn.user_id != user_id:
        raise ValueError("Transaction not found")
    if _is_transfer_transaction(db, txn):
        raise ValueError("Transfer transactions cannot be edited.")

    old_account = txn.account
    revert_transaction_effect(old_account, txn.transaction_type, txn.amount)

    new_account = _validate_transaction_payload(db, user_id, payload)
    ensure_sufficient_funds(new_account, payload.transaction_type, payload.amount)

    txn.description = payload.description
    txn.amount = payload.amount
    txn.currency = payload.currency
    txn.transaction_type = payload.transaction_type
    txn.occurred_at = payload.occurred_at
    txn.account_id = payload.account_id
    txn.category_id = payload.category_id
    txn.pocket_id = payload.pocket_id

    apply_transaction_effect(new_account, payload.transaction_type, payload.amount)

    updated_txn = commit_and_refresh(db, txn)
    invalidate_metrics_cache(user_id)
    return updated_txn


def delete_transaction(db: Session, user_id: int, transaction_id: int) -> None:
    """Eliminar una transacción y revertir su efecto en el saldo."""
    txn = db.get(Transaction, transaction_id)
    if not txn or txn.user_id != user_id:
        raise ValueError("Transaction not found")

    account = txn.account
    revert_transaction_effect(account, txn.transaction_type, txn.amount)
    db.delete(txn)
    db.commit()
    invalidate_metrics_cache(user_id)


def create_transfer(
    db: Session, user_id: int, payload: TransferCreate
) -> tuple[Transaction, Transaction]:
    """Crear de forma atómica una transferencia entre dos cuentas del usuario.

    Devuelve la tupla (debit_txn, credit_txn) en un único commit.
    """
    from_account = db.get(Account, payload.from_account_id)
    if not from_account or from_account.bank.user_id != user_id:
        raise ValueError("Source account not found")

    to_account = db.get(Account, payload.to_account_id)
    if not to_account or to_account.bank.user_id != user_id:
        raise ValueError("Destination account not found")

    if from_account.id == to_account.id:
        raise ValueError("Source and destination accounts must be different")

    ensure_sufficient_funds(from_account, TransactionType.EXPENSE, payload.amount)

    description = f"Transferencia: {from_account.name} a {to_account.name}"

    debit = Transaction(
        description=description,
        amount=payload.amount,
        currency=from_account.currency,
        transaction_type=TransactionType.EXPENSE,
        occurred_at=payload.occurred_at,
        user_id=user_id,
        account_id=from_account.id,
        category_id=None,
        pocket_id=None,
    )
    credit = Transaction(
        description=description,
        amount=payload.amount,
        currency=to_account.currency,
        transaction_type=TransactionType.INCOME,
        occurred_at=payload.occurred_at,
        user_id=user_id,
        account_id=to_account.id,
        category_id=None,
        pocket_id=None,
    )
    db.add(debit)
    db.add(credit)

    apply_transaction_effect(from_account, TransactionType.EXPENSE, payload.amount)
    apply_transaction_effect(to_account, TransactionType.INCOME, payload.amount)

    db.commit()
    db.refresh(debit)
    db.refresh(credit)
    invalidate_metrics_cache(user_id)
    return debit, credit


def list_transactions(  # pylint: disable=too-many-arguments
    db: Session,
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
    """Listar transacciones del usuario aplicando filtros opcionales."""
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
    query = query.order_by(Transaction.occurred_at.desc()).offset(skip).limit(limit)
    return list(db.scalars(query).all())
