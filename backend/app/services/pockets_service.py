"""CRUD de bolsillos y movimientos de fondos a un bolsillo."""
from dataclasses import dataclass

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


@dataclass
class PocketServiceDeps:
    """Dependency container for pocket service repositories."""

    accounts: AccountRepository
    pockets: PocketRepository
    transactions: TransactionRepository


def build_pocket_service_deps(db: Session) -> PocketServiceDeps:
    """Build default repository dependencies for pocket services."""
    return PocketServiceDeps(
        accounts=AccountRepository(db),
        pockets=PocketRepository(db),
        transactions=TransactionRepository(db),
    )


def create_pocket(
    db: Session,
    user_id: int,
    payload: PocketCreate,
    deps: PocketServiceDeps | None = None,
) -> Pocket:
    """Crear un bolsillo bajo una cuenta propiedad del usuario."""
    resolved_deps = deps or build_pocket_service_deps(db)

    account = resolved_deps.accounts.get_owned(user_id, payload.account_id)
    if account is None:
        raise ValueError("Invalid account for user")

    if payload.currency != account.currency:
        raise ValueError("Pocket currency must match account currency")

    if resolved_deps.pockets.find_duplicate_name(payload.account_id, payload.name) is not None:
        raise ValueError("Pocket name already exists for account")

    pocket = Pocket(
        name=payload.name,
        balance=payload.balance,
        currency=payload.currency,
        account_id=payload.account_id,
    )
    return resolved_deps.pockets.add(pocket)


def list_pockets(
    db: Session,
    user_id: int,
    deps: PocketServiceDeps | None = None,
) -> list[Pocket]:
    """Listar los bolsillos del usuario."""
    resolved_deps = deps or build_pocket_service_deps(db)
    return resolved_deps.pockets.list_by_user(user_id)


def get_pocket(
    db: Session,
    user_id: int,
    pocket_id: int,
    deps: PocketServiceDeps | None = None,
) -> Pocket:
    """Recuperar un bolsillo propiedad del usuario."""
    resolved_deps = deps or build_pocket_service_deps(db)
    pocket = resolved_deps.pockets.get_owned(user_id, pocket_id)
    if pocket is None:
        raise ValueError("Pocket not found")
    return pocket


def update_pocket(
    db: Session,
    user_id: int,
    pocket_id: int,
    payload: PocketUpdate,
    deps: PocketServiceDeps | None = None,
) -> Pocket:
    """Actualizar metadatos del bolsillo cuando ambos pertenecen al usuario."""
    resolved_deps = deps or build_pocket_service_deps(db)
    pocket = resolved_deps.pockets.get_owned(user_id, pocket_id)
    if pocket is None:
        raise ValueError("Pocket not found")

    account = resolved_deps.accounts.get_owned(user_id, payload.account_id)
    if account is None:
        raise ValueError("Invalid account for user")

    if account.currency != pocket.currency:
        raise ValueError("Cannot move pocket to account with different currency")

    if (
        resolved_deps.pockets.find_duplicate_name(
            payload.account_id, payload.name, exclude_pocket_id=pocket_id
        )
        is not None
    ):
        raise ValueError("Pocket name already exists for account")

    pocket.name = payload.name
    pocket.account_id = payload.account_id
    return resolved_deps.pockets.commit_refresh(pocket)


def delete_pocket(
    db: Session,
    user_id: int,
    pocket_id: int,
    deps: PocketServiceDeps | None = None,
) -> None:
    """Eliminar un bolsillo propiedad del usuario."""
    resolved_deps = deps or build_pocket_service_deps(db)
    pocket = resolved_deps.pockets.get_owned(user_id, pocket_id)
    if pocket is None:
        raise ValueError("Pocket not found")
    resolved_deps.pockets.delete(pocket)


def move_amount_to_pocket(
    db: Session,
    user_id: int,
    payload: PocketMoveCreate,
    deps: PocketServiceDeps | None = None,
) -> Transaction:
    """Mover fondos desde una cuenta a un bolsillo, registrado como gasto."""
    resolved_deps = deps or build_pocket_service_deps(db)

    account = resolved_deps.accounts.get_owned(user_id, payload.account_id)
    if account is None:
        raise ValueError("Invalid account for user")

    pocket = resolved_deps.pockets.get_owned(user_id, payload.pocket_id)
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
    resolved_deps.transactions.add_pending(txn)

    apply_transaction_effect(account, TransactionType.EXPENSE, payload.amount)
    pocket.balance += payload.amount

    created_txn = commit_and_refresh(db, txn)
    invalidate_metrics_cache(user_id)
    return created_txn


def withdraw_amount_from_pocket(
    db: Session,
    user_id: int,
    payload: PocketWithdrawCreate,
    deps: PocketServiceDeps | None = None,
) -> Transaction:
    """Retirar fondos de un bolsillo y devolverlos al saldo de la cuenta, registrado como ingreso."""
    resolved_deps = deps or build_pocket_service_deps(db)

    pocket = resolved_deps.pockets.get_owned(user_id, payload.pocket_id)
    if pocket is None:
        raise ValueError("Pocket not found")

    if payload.amount > pocket.balance:
        raise ValueError("Insufficient pocket balance")

    account = resolved_deps.accounts.get_owned(user_id, pocket.account_id)
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
    resolved_deps.transactions.add_pending(txn)

    apply_transaction_effect(account, TransactionType.INCOME, payload.amount)
    pocket.balance -= payload.amount

    created_txn = commit_and_refresh(db, txn)
    invalidate_metrics_cache(user_id)
    return created_txn
