"""CRUD de cuentas bancarias del usuario."""
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.enums import AccountType, Currency
from app.repositories.accounts import AccountRepository
from app.repositories.banks import BankRepository
from app.schemas.account import AccountCreate, AccountUpdate


def create_account(db: Session, user_id: int, payload: AccountCreate) -> Account:
    """Crear una cuenta asociada a un banco propio del usuario."""
    if BankRepository(db).get_owned(user_id, payload.bank_id) is None:
        raise ValueError("Invalid bank for user")

    account = Account(
        name=payload.name,
        account_type=payload.account_type,
        currency=payload.currency,
        # Las cuentas nuevas siempre arrancan en cero; el saldo inicial es un movimiento.
        current_balance=Decimal("0"),
        bank_id=payload.bank_id,
    )
    return AccountRepository(db).add(account)


def list_accounts(
    db: Session,
    user_id: int,
    search: str | None = None,
    account_type: AccountType | None = None,
    currency: Currency | None = None,
    bank_id: int | None = None,
) -> list[Account]:
    """Listar cuentas del usuario aplicando filtros opcionales."""
    return AccountRepository(db).list_by_user(
        user_id,
        search=search,
        account_type=account_type,
        currency=currency,
        bank_id=bank_id,
    )


def update_account(
    db: Session, user_id: int, account_id: int, payload: AccountUpdate
) -> Account:
    """Actualizar una cuenta propiedad del usuario."""
    accounts = AccountRepository(db)
    account = accounts.get_owned(user_id, account_id)
    if account is None:
        raise ValueError("Account not found")
    if BankRepository(db).get_owned(user_id, payload.bank_id) is None:
        raise ValueError("Invalid bank for user")
    account.name = payload.name
    account.account_type = payload.account_type
    account.currency = payload.currency
    account.bank_id = payload.bank_id
    return accounts.commit_refresh(account)


def delete_account(db: Session, user_id: int, account_id: int) -> None:
    """Eliminar una cuenta propiedad del usuario."""
    accounts = AccountRepository(db)
    account = accounts.get_owned(user_id, account_id)
    if account is None:
        raise ValueError("Account not found")
    accounts.delete(account)
