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
    user = db.get(User, user_id)
    if not user:
        raise ValueError("User not found")
    return user


def create_bank(db: Session, user_id: int, payload: BankCreate) -> Bank:
    _get_user(db, user_id)
    bank = Bank(name=payload.name, country_code=payload.country_code.upper(), user_id=user_id)
    db.add(bank)
    db.commit()
    db.refresh(bank)
    return bank


def create_account(db: Session, user_id: int, payload: AccountCreate) -> Account:
    bank = db.get(Bank, payload.bank_id)
    if not bank or bank.user_id != user_id:
        raise ValueError("Invalid bank for user")

    account = Account(
        name=payload.name,
        account_type=payload.account_type,
        currency=payload.currency,
        current_balance=payload.current_balance,
        bank_id=payload.bank_id,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def create_pocket(db: Session, user_id: int, payload: PocketCreate) -> Pocket:
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
    category = Category(name=payload.name, user_id=user_id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def register_transaction(db: Session, user_id: int, payload: TransactionCreate) -> Transaction:
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

    if payload.transaction_type == TransactionType.INCOME:
        account.current_balance += payload.amount
    else:
        account.current_balance -= payload.amount

    db.commit()
    db.refresh(txn)
    return txn


def list_transactions(
    db: Session,
    user_id: int,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> list[Transaction]:
    query = select(Transaction).where(Transaction.user_id == user_id)
    if start_date:
        query = query.where(Transaction.occurred_at >= start_date)
    if end_date:
        query = query.where(Transaction.occurred_at <= end_date)
    query = query.order_by(Transaction.occurred_at.desc())
    return list(db.scalars(query).all())


def get_dashboard_metrics(db: Session, user_id: int, target_currency: str = "COP") -> DashboardMetrics:
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
