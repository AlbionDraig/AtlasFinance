"""Movimientos: registro, edición, eliminación, transferencias y listados."""
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.enums import Currency, TransactionType
from app.models.transaction import Transaction
from app.repositories.accounts import AccountRepository
from app.repositories.categories import CategoryRepository
from app.repositories.pockets import PocketRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.transaction import TransactionCreate, TransferCreate
from app.services._common import (
    apply_transaction_effect,
    commit_and_refresh,
    ensure_sufficient_funds,
    invalidate_metrics_cache,
    revert_transaction_effect,
)


@dataclass
class TransactionServiceDeps:
    """Dependency container to decouple service functions from concrete wiring."""

    accounts: AccountRepository
    categories: CategoryRepository
    pockets: PocketRepository
    transactions: TransactionRepository


def build_transaction_service_deps(db: Session) -> TransactionServiceDeps:
    """Build default repository dependencies for transactions service."""
    return TransactionServiceDeps(
        accounts=AccountRepository(db),
        categories=CategoryRepository(db),
        pockets=PocketRepository(db),
        transactions=TransactionRepository(db),
    )


def _validate_transaction_payload(
    db: Session,
    user_id: int,
    payload: TransactionCreate,
    deps: TransactionServiceDeps | None = None,
) -> Account:
    """Validar relaciones de propiedad y devolver la cuenta destino."""
    resolved_deps = deps or build_transaction_service_deps(db)

    account = resolved_deps.accounts.get_owned(user_id, payload.account_id)
    if account is None:
        raise ValueError("Invalid account for user")

    if payload.pocket_id:
        pocket = resolved_deps.pockets.get(payload.pocket_id)
        if not pocket or pocket.account_id != payload.account_id:
            raise ValueError("Pocket does not belong to account")

    if payload.category_id:
        if resolved_deps.categories.get(payload.category_id) is None:
            raise ValueError("Invalid category")

    return account


def _is_transfer_transaction(
    db: Session,
    txn: Transaction,
    deps: TransactionServiceDeps | None = None,
) -> bool:
    """Detectar pares de transferencias para impedir su edición directa."""
    resolved_deps = deps or build_transaction_service_deps(db)

    if not txn.description.startswith("Transferencia: "):
        return False
    return resolved_deps.transactions.find_mirror_transfer_id(txn) is not None


def register_transaction(
    db: Session,
    user_id: int,
    payload: TransactionCreate,
    deps: TransactionServiceDeps | None = None,
) -> Transaction:
    """Crear una transacción y actualizar el saldo de la cuenta."""
    resolved_deps = deps or build_transaction_service_deps(db)
    account = _validate_transaction_payload(db, user_id, payload, resolved_deps)
    txn_repo = resolved_deps.transactions

    if payload.is_initial_balance:
        if txn_repo.first_id_for_account(user_id, payload.account_id) is not None:
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
    txn_repo.add_pending(txn)

    apply_transaction_effect(account, payload.transaction_type, payload.amount)

    created_txn = commit_and_refresh(db, txn)
    invalidate_metrics_cache(user_id)
    return created_txn


def update_transaction(
    db: Session,
    user_id: int,
    transaction_id: int,
    payload: TransactionCreate,
    deps: TransactionServiceDeps | None = None,
) -> Transaction:
    """Actualizar una transacción y mantener saldos consistentes."""
    resolved_deps = deps or build_transaction_service_deps(db)
    txn_repo = resolved_deps.transactions
    txn = txn_repo.get_owned(user_id, transaction_id)
    if txn is None:
        raise ValueError("Transaction not found")
    if _is_transfer_transaction(db, txn, resolved_deps):
        raise ValueError("Transfer transactions cannot be edited.")

    old_account = txn.account
    revert_transaction_effect(old_account, txn.transaction_type, txn.amount)

    new_account = _validate_transaction_payload(db, user_id, payload, resolved_deps)
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


def delete_transaction(
    db: Session,
    user_id: int,
    transaction_id: int,
    deps: TransactionServiceDeps | None = None,
) -> None:
    """Eliminar una transacción y revertir su efecto en el saldo."""
    resolved_deps = deps or build_transaction_service_deps(db)
    txn_repo = resolved_deps.transactions
    txn = txn_repo.get_owned(user_id, transaction_id)
    if txn is None:
        raise ValueError("Transaction not found")

    revert_transaction_effect(txn.account, txn.transaction_type, txn.amount)
    txn_repo.delete(txn)
    invalidate_metrics_cache(user_id)


def create_transfer(
    db: Session,
    user_id: int,
    payload: TransferCreate,
    deps: TransactionServiceDeps | None = None,
) -> tuple[Transaction, Transaction]:
    """Crear de forma atómica una transferencia entre dos cuentas del usuario."""
    resolved_deps = deps or build_transaction_service_deps(db)
    accounts = resolved_deps.accounts
    from_account = accounts.get_owned(user_id, payload.from_account_id)
    if from_account is None:
        raise ValueError("Source account not found")

    to_account = accounts.get_owned(user_id, payload.to_account_id)
    if to_account is None:
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
    txn_repo = resolved_deps.transactions
    txn_repo.add_pending(debit)
    txn_repo.add_pending(credit)

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
    deps: TransactionServiceDeps | None = None,
) -> tuple[list[Transaction], int]:
    """Listar transacciones del usuario aplicando filtros opcionales.

    Returns:
        Tuple (items, total) donde total es el recuento sin paginar para que
        el endpoint pueda construir la respuesta paginada sin una segunda llamada.
    """
    resolved_deps = deps or build_transaction_service_deps(db)
    repo = resolved_deps.transactions
    items = repo.list_by_user(
        user_id,
        start_date=start_date,
        end_date=end_date,
        account_id=account_id,
        transaction_type=transaction_type,
        currency=currency,
        search=search,
        skip=skip,
        limit=limit,
    )
    total = repo.count_by_user(
        user_id,
        start_date=start_date,
        end_date=end_date,
        account_id=account_id,
        transaction_type=transaction_type,
        currency=currency,
        search=search,
    )
    return items, total
