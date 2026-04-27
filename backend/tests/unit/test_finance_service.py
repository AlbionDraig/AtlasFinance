from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.models.enums import AccountType, Currency, TransactionType
from app.schemas.account import AccountCreate
from app.schemas.bank import BankCreate
from app.schemas.category import CategoryCreate
from app.schemas.transaction import TransactionCreate
from app.schemas.user import UserCreate
from app.services.auth_service import create_user
from app.services.finance_service import (
    create_account,
    create_bank,
    create_category,
    get_dashboard_metrics,
    list_categories,
    register_transaction,
)

TEST_PASSWORD = "AtlasFinanceTestPwd123!"


def test_register_transaction_updates_balance_and_metrics(db_session, monkeypatch):
    monkeypatch.setattr("app.services.finance_service.convert_currency", lambda amount, _f, _t: amount)

    user = create_user(
        db_session,
        UserCreate(email="metrics@test.com", full_name="Metrics", password=TEST_PASSWORD),
    )
    bank = create_bank(db_session, user.id, BankCreate(name="Bancolombia", country_code="CO"))
    account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Cuenta principal",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("1000"),
            bank_id=bank.id,
        ),
    )
    category = create_category(db_session, CategoryCreate(name="food"))

    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="NOMINA",
            amount=Decimal("500"),
            currency=Currency.COP,
            transaction_type=TransactionType.INCOME,
            occurred_at=datetime.now(timezone.utc),
            account_id=account.id,
            category_id=category.id,
        ),
    )
    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="MERCADO",
            amount=Decimal("200"),
            currency=Currency.COP,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=datetime.now(timezone.utc),
            account_id=account.id,
            category_id=category.id,
        ),
    )

    metrics = get_dashboard_metrics(db_session, user.id, target_currency="COP")

    assert metrics.total_income == Decimal("500")
    assert metrics.total_expenses == Decimal("200")
    assert metrics.cashflow == Decimal("300")
    assert metrics.net_worth == Decimal("300")


def test_categories_are_global_and_reusable_across_users(db_session):
    first_user = create_user(
        db_session,
        UserCreate(email="categories1@test.com", full_name="Categories 1", password=TEST_PASSWORD),
    )
    second_user = create_user(
        db_session,
        UserCreate(email="categories2@test.com", full_name="Categories 2", password=TEST_PASSWORD),
    )

    category = create_category(db_session, CategoryCreate(name="shared-category"))

    visible_categories = list_categories(db_session)
    assert any(item.id == category.id for item in visible_categories)

    bank = create_bank(db_session, second_user.id, BankCreate(name="Davivienda", country_code="CO"))
    account = create_account(
        db_session,
        second_user.id,
        AccountCreate(
            name="Cuenta secundaria",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("2500"),
            bank_id=bank.id,
        ),
    )

    register_transaction(
        db_session,
        second_user.id,
        TransactionCreate(
            description="Fondeo inicial",
            amount=Decimal("500"),
            currency=Currency.COP,
            transaction_type=TransactionType.INCOME,
            occurred_at=datetime.now(timezone.utc),
            account_id=account.id,
            category_id=category.id,
        ),
    )

    txn = register_transaction(
        db_session,
        second_user.id,
        TransactionCreate(
            description="Compra compartida",
            amount=Decimal("300"),
            currency=Currency.COP,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=datetime.now(timezone.utc),
            account_id=account.id,
            category_id=category.id,
        ),
    )

    assert txn.category_id == category.id
    assert first_user.id != second_user.id


def test_register_transaction_rejects_expense_when_funds_are_insufficient(db_session):
    user = create_user(
        db_session,
        UserCreate(email="insufficient@test.com", full_name="Insufficient", password=TEST_PASSWORD),
    )
    bank = create_bank(db_session, user.id, BankCreate(name="Bancolombia", country_code="CO"))
    account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Cuenta origen",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("100"),
            bank_id=bank.id,
        ),
    )

    with pytest.raises(ValueError, match="Fondos insuficientes en la cuenta seleccionada\\."):
        register_transaction(
            db_session,
            user.id,
            TransactionCreate(
                description="Compra mayor al saldo",
                amount=Decimal("150"),
                currency=Currency.COP,
                transaction_type=TransactionType.EXPENSE,
                occurred_at=datetime.now(timezone.utc),
                account_id=account.id,
            ),
        )
