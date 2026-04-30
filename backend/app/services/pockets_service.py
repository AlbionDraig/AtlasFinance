"""CRUD de bolsillos (sub-saldos dentro de una cuenta) y movimiento de fondos."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.bank import Bank
from app.models.enums import TransactionType
from app.models.pocket import Pocket
from app.models.transaction import Transaction
from app.schemas.pocket import PocketCreate, PocketMoveCreate, PocketUpdate
from app.services._common import (
    apply_transaction_effect,
    commit_and_refresh,
    ensure_sufficient_funds,
    invalidate_metrics_cache,
    persist_and_refresh,
)


def create_pocket(db: Session, user_id: int, payload: PocketCreate) -> Pocket:
    """Crear un bolsillo bajo una cuenta propiedad del usuario."""
    account = db.get(Account, payload.account_id)
    if not account or account.bank.user_id != user_id:
        raise ValueError("Invalid account for user")

    if payload.currency != account.currency:
        raise ValueError("Pocket currency must match account currency")

    duplicated_name = db.scalar(
        select(Pocket.id)
        .where(
            Pocket.account_id == payload.account_id,
            func.lower(Pocket.name) == payload.name.lower(),
        )
        .limit(1)
    )
    if duplicated_name is not None:
        raise ValueError("Pocket name already exists for account")

    pocket = Pocket(
        name=payload.name,
        balance=payload.balance,
        currency=payload.currency,
        account_id=payload.account_id,
    )
    return persist_and_refresh(db, pocket)


def list_pockets(db: Session, user_id: int) -> list[Pocket]:
    """Listar los bolsillos del usuario."""
    query = (
        select(Pocket)
        .join(Account)
        .join(Bank)
        .where(Bank.user_id == user_id)
        .order_by(Pocket.created_at.desc())
    )
    return list(db.scalars(query).all())


def get_pocket(db: Session, user_id: int, pocket_id: int) -> Pocket:
    """Recuperar un bolsillo propiedad del usuario."""
    pocket = db.get(Pocket, pocket_id)
    if not pocket or pocket.account.bank.user_id != user_id:
        raise ValueError("Pocket not found")
    return pocket


def update_pocket(
    db: Session, user_id: int, pocket_id: int, payload: PocketUpdate
) -> Pocket:
    """Actualizar metadatos del bolsillo cuando ambos pertenecen al usuario."""
    pocket = db.get(Pocket, pocket_id)
    if not pocket or pocket.account.bank.user_id != user_id:
        raise ValueError("Pocket not found")

    account = db.get(Account, payload.account_id)
    if not account or account.bank.user_id != user_id:
        raise ValueError("Invalid account for user")

    if account.currency != pocket.currency:
        raise ValueError("Cannot move pocket to account with different currency")

    duplicated_name = db.scalar(
        select(Pocket.id)
        .where(
            Pocket.account_id == payload.account_id,
            func.lower(Pocket.name) == payload.name.lower(),
            Pocket.id != pocket_id,
        )
        .limit(1)
    )
    if duplicated_name is not None:
        raise ValueError("Pocket name already exists for account")

    pocket.name = payload.name
    pocket.account_id = payload.account_id
    return persist_and_refresh(db, pocket)


def delete_pocket(db: Session, user_id: int, pocket_id: int) -> None:
    """Eliminar un bolsillo propiedad del usuario."""
    pocket = db.get(Pocket, pocket_id)
    if not pocket or pocket.account.bank.user_id != user_id:
        raise ValueError("Pocket not found")
    db.delete(pocket)
    db.commit()


def move_amount_to_pocket(
    db: Session, user_id: int, payload: PocketMoveCreate
) -> Transaction:
    """Mover fondos desde una cuenta a un bolsillo, registrado como gasto."""
    account = db.get(Account, payload.account_id)
    if not account or account.bank.user_id != user_id:
        raise ValueError("Invalid account for user")

    pocket = db.get(Pocket, payload.pocket_id)
    if not pocket or pocket.account.bank.user_id != user_id:
        raise ValueError("Pocket not found")
    if pocket.account_id != payload.account_id:
        raise ValueError("Pocket does not belong to account")
    if pocket.currency != account.currency:
        raise ValueError("Pocket currency must match account currency")

    ensure_sufficient_funds(account, TransactionType.EXPENSE, payload.amount)

    description = f"Movimiento a Bolsillo {pocket.name}"
    txn = Transaction(
        description=description,
        amount=payload.amount,
        currency=account.currency,
        transaction_type=TransactionType.EXPENSE,
        occurred_at=payload.occurred_at,
        user_id=user_id,
        account_id=payload.account_id,
        category_id=None,
        pocket_id=payload.pocket_id,
    )
    db.add(txn)

    apply_transaction_effect(account, TransactionType.EXPENSE, payload.amount)
    pocket.balance += payload.amount

    created_txn = commit_and_refresh(db, txn)
    invalidate_metrics_cache(user_id)
    return created_txn
