"""CRUD de bolsillos y movimientos de fondos a un bolsillo."""
from sqlalchemy.orm import Session

from app.models.enums import TransactionType
from app.models.pocket import Pocket
from app.models.transaction import Transaction
from app.repositories.accounts import AccountRepository
from app.repositories.pockets import PocketRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.pocket import PocketCreate, PocketMoveCreate, PocketUpdate, PocketWithdrawCreate
from app.services._common import (
    apply_transaction_effect,
    commit_and_refresh,
    ensure_sufficient_funds,
    invalidate_metrics_cache,
)


def create_pocket(db: Session, user_id: int, payload: PocketCreate) -> Pocket:
    """Crear un bolsillo bajo una cuenta propiedad del usuario."""
    account = AccountRepository(db).get_owned(user_id, payload.account_id)
    if account is None:
        raise ValueError("Invalid account for user")

    if payload.currency != account.currency:
        raise ValueError("Pocket currency must match account currency")

    pockets = PocketRepository(db)
    if pockets.find_duplicate_name(payload.account_id, payload.name) is not None:
        raise ValueError("Pocket name already exists for account")

    pocket = Pocket(
        name=payload.name,
        balance=payload.balance,
        currency=payload.currency,
        account_id=payload.account_id,
    )
    return pockets.add(pocket)


def list_pockets(db: Session, user_id: int) -> list[Pocket]:
    """Listar los bolsillos del usuario."""
    return PocketRepository(db).list_by_user(user_id)


def get_pocket(db: Session, user_id: int, pocket_id: int) -> Pocket:
    """Recuperar un bolsillo propiedad del usuario."""
    pocket = PocketRepository(db).get_owned(user_id, pocket_id)
    if pocket is None:
        raise ValueError("Pocket not found")
    return pocket


def update_pocket(
    db: Session, user_id: int, pocket_id: int, payload: PocketUpdate
) -> Pocket:
    """Actualizar metadatos del bolsillo cuando ambos pertenecen al usuario."""
    pockets = PocketRepository(db)
    pocket = pockets.get_owned(user_id, pocket_id)
    if pocket is None:
        raise ValueError("Pocket not found")

    account = AccountRepository(db).get_owned(user_id, payload.account_id)
    if account is None:
        raise ValueError("Invalid account for user")

    if account.currency != pocket.currency:
        raise ValueError("Cannot move pocket to account with different currency")

    if (
        pockets.find_duplicate_name(
            payload.account_id, payload.name, exclude_pocket_id=pocket_id
        )
        is not None
    ):
        raise ValueError("Pocket name already exists for account")

    pocket.name = payload.name
    pocket.account_id = payload.account_id
    return pockets.commit_refresh(pocket)


def delete_pocket(db: Session, user_id: int, pocket_id: int) -> None:
    """Eliminar un bolsillo propiedad del usuario."""
    pockets = PocketRepository(db)
    pocket = pockets.get_owned(user_id, pocket_id)
    if pocket is None:
        raise ValueError("Pocket not found")
    pockets.delete(pocket)


def move_amount_to_pocket(
    db: Session, user_id: int, payload: PocketMoveCreate
) -> Transaction:
    """Mover fondos desde una cuenta a un bolsillo, registrado como gasto."""
    account = AccountRepository(db).get_owned(user_id, payload.account_id)
    if account is None:
        raise ValueError("Invalid account for user")

    pocket = PocketRepository(db).get_owned(user_id, payload.pocket_id)
    if pocket is None:
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
    TransactionRepository(db).add_pending(txn)

    apply_transaction_effect(account, TransactionType.EXPENSE, payload.amount)
    pocket.balance += payload.amount

    created_txn = commit_and_refresh(db, txn)
    invalidate_metrics_cache(user_id)
    return created_txn


def withdraw_amount_from_pocket(
    db: Session, user_id: int, payload: PocketWithdrawCreate
) -> Transaction:
    """Retirar fondos de un bolsillo y devolverlos al saldo de la cuenta, registrado como ingreso."""
    pocket = PocketRepository(db).get_owned(user_id, payload.pocket_id)
    if pocket is None:
        raise ValueError("Pocket not found")

    if payload.amount > pocket.balance:
        raise ValueError("Insufficient pocket balance")

    account = AccountRepository(db).get_owned(user_id, pocket.account_id)
    if account is None:
        raise ValueError("Invalid account for user")

    description = f"Retiro de Bolsillo {pocket.name}"
    txn = Transaction(
        description=description,
        amount=payload.amount,
        currency=account.currency,
        transaction_type=TransactionType.INCOME,
        occurred_at=payload.occurred_at,
        user_id=user_id,
        account_id=pocket.account_id,
        category_id=None,
        pocket_id=payload.pocket_id,
    )
    TransactionRepository(db).add_pending(txn)

    apply_transaction_effect(account, TransactionType.INCOME, payload.amount)
    pocket.balance -= payload.amount

    created_txn = commit_and_refresh(db, txn)
    invalidate_metrics_cache(user_id)
    return created_txn
