"""CRUD de cuentas bancarias del usuario."""
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.bank import Bank
from app.models.enums import AccountType, Currency
from app.schemas.account import AccountCreate, AccountUpdate
from app.services._common import persist_and_refresh


def create_account(db: Session, user_id: int, payload: AccountCreate) -> Account:
    """Crear una cuenta asociada a un banco propio del usuario."""
    bank = db.get(Bank, payload.bank_id)
    if not bank or bank.user_id != user_id:
        raise ValueError("Invalid bank for user")

    account = Account(
        name=payload.name,
        account_type=payload.account_type,
        currency=payload.currency,
        # Las cuentas nuevas siempre arrancan en cero; el saldo inicial es un movimiento.
        current_balance=Decimal("0"),
        bank_id=payload.bank_id,
    )
    return persist_and_refresh(db, account)


def list_accounts(
    db: Session,
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
    return list(db.scalars(query).all())


def update_account(
    db: Session, user_id: int, account_id: int, payload: AccountUpdate
) -> Account:
    """Actualizar una cuenta propiedad del usuario."""
    account = db.get(Account, account_id)
    if not account or account.bank.user_id != user_id:
        raise ValueError("Account not found")
    bank = db.get(Bank, payload.bank_id)
    if not bank or bank.user_id != user_id:
        raise ValueError("Invalid bank for user")
    account.name = payload.name
    account.account_type = payload.account_type
    account.currency = payload.currency
    account.bank_id = payload.bank_id
    return persist_and_refresh(db, account)


def delete_account(db: Session, user_id: int, account_id: int) -> None:
    """Eliminar una cuenta propiedad del usuario."""
    account = db.get(Account, account_id)
    if not account or account.bank.user_id != user_id:
        raise ValueError("Account not found")
    db.delete(account)
    db.commit()
