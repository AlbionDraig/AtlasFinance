from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.bank import Bank
from app.models.category import Category
from app.models.enums import TransactionType
from app.models.investment import Investment
from app.models.pocket import Pocket
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.account import AccountCreate
from app.schemas.bank import BankCreate
from app.schemas.category import CategoryCreate
from app.schemas.metric import DashboardMetrics
from app.schemas.pocket import PocketCreate
from app.schemas.transaction import TransactionCreate
from app.services.currency_service import convert_currency


def _get_user(db: Session, user_id: int) -> User:
    """Return an existing user or raise a domain-level validation error."""
    user = db.get(User, user_id)
    if not user:
        raise ValueError("User not found")
    return user


def create_bank(db: Session, user_id: int, payload: BankCreate) -> Bank:
    """Create a bank owned by the authenticated user."""
    _get_user(db, user_id)
    bank = Bank(name=payload.name, country_code=payload.country_code.upper(), user_id=user_id)
    db.add(bank)
    db.commit()
    db.refresh(bank)
    return bank


def list_banks(db: Session, user_id: int) -> list[Bank]:
    """List user banks ordered by newest first."""
    query = select(Bank).where(Bank.user_id == user_id).order_by(Bank.created_at.desc())
    return list(db.scalars(query).all())


def create_account(db: Session, user_id: int, payload: AccountCreate) -> Account:
    """Create an account linked to one of the user's banks."""
    bank = db.get(Bank, payload.bank_id)
    if not bank or bank.user_id != user_id:
        raise ValueError("Invalid bank for user")

    account = Account(
        name=payload.name,
        account_type=payload.account_type,
        currency=payload.currency,
        # New accounts always start at zero; opening balance is a movement.
        current_balance=Decimal("0"),
        bank_id=payload.bank_id,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def list_accounts(db: Session, user_id: int) -> list[Account]:
    """List accounts that belong to the authenticated user."""
    query = select(Account).join(Bank).where(Bank.user_id == user_id).order_by(Account.created_at.desc())
    return list(db.scalars(query).all())


def create_pocket(db: Session, user_id: int, payload: PocketCreate) -> Pocket:
    """Create a pocket under an account that belongs to the user."""
    account = db.get(Account, payload.account_id)
    if not account or account.bank.user_id != user_id:
        raise ValueError("Invalid account for user")

    pocket = Pocket(
        name=payload.name,
        balance=payload.balance,
        currency=payload.currency,
        account_id=payload.account_id,
    )
    db.add(pocket)
    db.commit()
    db.refresh(pocket)
    return pocket


def create_category(db: Session, user_id: int, payload: CategoryCreate) -> Category:
    """Create a custom category for the authenticated user."""
    category = Category(name=payload.name, user_id=user_id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def list_categories(db: Session, user_id: int) -> list[Category]:
    """List categories owned by the authenticated user."""
    query = select(Category).where(Category.user_id == user_id).order_by(Category.created_at.desc())
    return list(db.scalars(query).all())


def _apply_transaction_effect(account: Account, transaction_type: TransactionType, amount: Decimal) -> None:
    """Apply transaction impact to account balance."""
    if transaction_type == TransactionType.INCOME:
        account.current_balance += amount
    else:
        account.current_balance -= amount


def _revert_transaction_effect(account: Account, transaction_type: TransactionType, amount: Decimal) -> None:
    """Revert a previously applied transaction impact from account balance."""
    if transaction_type == TransactionType.INCOME:
        account.current_balance -= amount
    else:
        account.current_balance += amount


def _validate_transaction_payload(db: Session, user_id: int, payload: TransactionCreate) -> Account:
    """Validate ownership/relations and return the destination account."""
    account = db.get(Account, payload.account_id)
    if not account or account.bank.user_id != user_id:
        raise ValueError("Invalid account for user")

    if payload.pocket_id:
        pocket = db.get(Pocket, payload.pocket_id)
        if not pocket or pocket.account_id != payload.account_id:
            raise ValueError("Pocket does not belong to account")

    if payload.category_id:
        category = db.get(Category, payload.category_id)
        if not category or category.user_id != user_id:
            raise ValueError("Invalid category for user")

    return account


def register_transaction(db: Session, user_id: int, payload: TransactionCreate) -> Transaction:
    """Create a transaction and update the account running balance."""
    account = _validate_transaction_payload(db, user_id, payload)

    if payload.is_initial_balance:
        existing_tx = db.scalar(
            select(Transaction.id)
            .where(Transaction.user_id == user_id, Transaction.account_id == payload.account_id)
            .limit(1)
        )
        if existing_tx is not None:
            raise ValueError("El saldo inicial solo se puede registrar una vez por cuenta.")

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

    _apply_transaction_effect(account, payload.transaction_type, payload.amount)

    db.commit()
    db.refresh(txn)
    return txn


def update_transaction(db: Session, user_id: int, transaction_id: int, payload: TransactionCreate) -> Transaction:
    """Update a transaction and keep account balances consistent."""
    txn = db.get(Transaction, transaction_id)
    if not txn or txn.user_id != user_id:
        raise ValueError("Transaction not found")

    old_account = txn.account
    _revert_transaction_effect(old_account, txn.transaction_type, txn.amount)

    new_account = _validate_transaction_payload(db, user_id, payload)

    txn.description = payload.description
    txn.amount = payload.amount
    txn.currency = payload.currency
    txn.transaction_type = payload.transaction_type
    txn.occurred_at = payload.occurred_at
    txn.account_id = payload.account_id
    txn.category_id = payload.category_id
    txn.pocket_id = payload.pocket_id

    _apply_transaction_effect(new_account, payload.transaction_type, payload.amount)

    db.commit()
    db.refresh(txn)
    return txn


def delete_transaction(db: Session, user_id: int, transaction_id: int) -> None:
    """Delete a transaction and reverse its balance effect."""
    txn = db.get(Transaction, transaction_id)
    if not txn or txn.user_id != user_id:
        raise ValueError("Transaction not found")

    account = txn.account
    _revert_transaction_effect(account, txn.transaction_type, txn.amount)
    db.delete(txn)
    db.commit()


def list_transactions(
    db: Session,
    user_id: int,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> list[Transaction]:
    """Return user transactions optionally filtered by date range."""
    query = select(Transaction).where(Transaction.user_id == user_id)
    if start_date:
        query = query.where(Transaction.occurred_at >= start_date)
    if end_date:
        query = query.where(Transaction.occurred_at <= end_date)
    query = query.order_by(Transaction.occurred_at.desc())
    return list(db.scalars(query).all())


def get_dashboard_metrics(db: Session, user_id: int, target_currency: str = "COP") -> DashboardMetrics:
    """Aggregate net worth, income, expenses and savings rate in a target currency."""
    accounts = db.scalars(select(Account).join(Bank).where(Bank.user_id == user_id)).all()
    investments = db.scalars(select(Investment).where(Investment.user_id == user_id)).all()
    transactions = db.scalars(select(Transaction).where(Transaction.user_id == user_id)).all()

    total_assets = Decimal("0")
    for account in accounts:
        total_assets += convert_currency(account.current_balance, account.currency.value, target_currency)
    for investment in investments:
        total_assets += convert_currency(investment.current_value, investment.currency.value, target_currency)

    totals = defaultdict(lambda: Decimal("0"))
    for txn in transactions:
        converted = convert_currency(txn.amount, txn.currency.value, target_currency)
        totals[txn.transaction_type.value] += converted

    total_income = totals[TransactionType.INCOME.value]
    total_expenses = totals[TransactionType.EXPENSE.value]
    cashflow = total_income - total_expenses
    savings_rate = (cashflow / total_income * Decimal("100")) if total_income > 0 else Decimal("0")

    return DashboardMetrics(
        net_worth=total_assets,
        total_income=total_income,
        total_expenses=total_expenses,
        savings_rate=savings_rate.quantize(Decimal("0.01")),
        cashflow=cashflow,
    )
