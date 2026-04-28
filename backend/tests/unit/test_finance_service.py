from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.models.enums import AccountType, Currency, TransactionType
from app.schemas.account import AccountCreate
from app.schemas.bank import BankCreate
from app.schemas.category import CategoryCreate
from app.schemas.country import CountryCreate, CountryUpdate
from app.schemas.transaction import TransactionCreate
from app.schemas.user import UserCreate
from app.services.auth_service import create_user
from app.services.finance_service import (
    create_account,
    create_bank,
    create_category,
    create_country,
    delete_account,
    delete_bank,
    delete_category,
    delete_country,
    delete_transaction,
    get_dashboard_metrics,
    list_categories,
    list_countries,
    list_transactions,
    register_transaction,
    update_account,
    update_bank,
    update_category,
    update_country,
    update_transaction,
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


def test_update_transaction_rejects_transfer_transactions(db_session):
    user = create_user(
        db_session,
        UserCreate(email="transfer-update@test.com", full_name="Transfer Update", password=TEST_PASSWORD),
    )
    bank = create_bank(db_session, user.id, BankCreate(name="Nequi", country_code="CO"))
    from_account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Origen",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=bank.id,
        ),
    )
    to_account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Destino",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=bank.id,
        ),
    )

    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Fondeo",
            amount=Decimal("500"),
            currency=Currency.COP,
            transaction_type=TransactionType.INCOME,
            occurred_at=datetime.now(timezone.utc),
            account_id=from_account.id,
        ),
    )

    transfer_time = datetime.now(timezone.utc)
    transfer_description = "Transferencia: Origen a Destino"
    transfer_expense = register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description=transfer_description,
            amount=Decimal("100"),
            currency=Currency.COP,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=transfer_time,
            account_id=from_account.id,
        ),
    )
    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description=transfer_description,
            amount=Decimal("100"),
            currency=Currency.COP,
            transaction_type=TransactionType.INCOME,
            occurred_at=transfer_time,
            account_id=to_account.id,
        ),
    )

    with pytest.raises(ValueError, match="Los movimientos de transferencia entre cuentas no se pueden editar ni eliminar\\."):
        update_transaction(
            db_session,
            user.id,
            transfer_expense.id,
            TransactionCreate(
                description="Intento editar",
                amount=Decimal("80"),
                currency=Currency.COP,
                transaction_type=TransactionType.EXPENSE,
                occurred_at=transfer_time,
                account_id=from_account.id,
            ),
        )


def test_delete_transaction_rejects_transfer_transactions(db_session):
    user = create_user(
        db_session,
        UserCreate(email="transfer-delete@test.com", full_name="Transfer Delete", password=TEST_PASSWORD),
    )
    bank = create_bank(db_session, user.id, BankCreate(name="Davivienda", country_code="CO"))
    from_account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Origen",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=bank.id,
        ),
    )
    to_account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Destino",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=bank.id,
        ),
    )

    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Fondeo",
            amount=Decimal("500"),
            currency=Currency.COP,
            transaction_type=TransactionType.INCOME,
            occurred_at=datetime.now(timezone.utc),
            account_id=from_account.id,
        ),
    )

    transfer_time = datetime.now(timezone.utc)
    transfer_description = "Transferencia: Origen a Destino"
    transfer_income = register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description=transfer_description,
            amount=Decimal("120"),
            currency=Currency.COP,
            transaction_type=TransactionType.INCOME,
            occurred_at=transfer_time,
            account_id=to_account.id,
        ),
    )
    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description=transfer_description,
            amount=Decimal("120"),
            currency=Currency.COP,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=transfer_time,
            account_id=from_account.id,
        ),
    )

    with pytest.raises(ValueError, match="Los movimientos de transferencia entre cuentas no se pueden editar ni eliminar\\."):
        delete_transaction(db_session, user.id, transfer_income.id)


def test_update_and_delete_bank_account_and_category(db_session):
    user = create_user(
        db_session,
        UserCreate(email="entity-manage@test.com", full_name="Entity Manage", password=TEST_PASSWORD),
    )
    bank = create_bank(db_session, user.id, BankCreate(name="Banco Inicial", country_code="co"))
    second_bank = create_bank(db_session, user.id, BankCreate(name="Banco Secundario", country_code="us"))

    updated_bank = update_bank(
        db_session,
        user.id,
        second_bank.id,
        BankCreate(name="Banco Editado", country_code="mx"),
    )
    assert updated_bank.name == "Banco Editado"
    assert updated_bank.country_code == "MX"

    account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Cuenta Inicial",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=bank.id,
        ),
    )
    removable_account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Cuenta Borrar",
            account_type=AccountType.CHECKING,
            currency=Currency.USD,
            current_balance=Decimal("0"),
            bank_id=second_bank.id,
        ),
    )

    updated_account = update_account(
        db_session,
        user.id,
        account.id,
        AccountCreate(
            name="Cuenta Editada",
            account_type=AccountType.CHECKING,
            currency=Currency.USD,
            current_balance=Decimal("999"),
            bank_id=second_bank.id,
        ),
    )
    assert updated_account.name == "Cuenta Editada"
    assert updated_account.bank_id == second_bank.id

    delete_account(db_session, user.id, removable_account.id)
    delete_bank(db_session, user.id, bank.id)

    category = create_category(
        db_session,
        CategoryCreate(name="categoria-inicial", description="base", is_fixed=False),
    )
    updated_category = update_category(
        db_session,
        category.id,
        CategoryCreate(name="categoria-editada", description="nueva", is_fixed=True),
    )
    assert updated_category.name == "categoria-editada"
    assert updated_category.is_fixed is True

    delete_category(db_session, category.id)
    assert all(item.id != category.id for item in list_categories(db_session))


def test_transaction_listing_update_and_delete_success_paths(db_session):
    user = create_user(
        db_session,
        UserCreate(email="txn-manage@test.com", full_name="Txn Manage", password=TEST_PASSWORD),
    )
    bank = create_bank(db_session, user.id, BankCreate(name="Banco Txn", country_code="CO"))
    account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Cuenta Txn",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=bank.id,
        ),
    )
    category = create_category(db_session, CategoryCreate(name="movimientos"))

    opening_txn = register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Saldo inicial",
            amount=Decimal("1000"),
            currency=Currency.COP,
            transaction_type=TransactionType.INCOME,
            occurred_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
            account_id=account.id,
            is_initial_balance=True,
        ),
    )

    expense_txn = register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Compra",
            amount=Decimal("200"),
            currency=Currency.COP,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=datetime(2026, 4, 2, tzinfo=timezone.utc),
            account_id=account.id,
            category_id=category.id,
        ),
    )

    updated_txn = update_transaction(
        db_session,
        user.id,
        expense_txn.id,
        TransactionCreate(
            description="Compra ajustada",
            amount=Decimal("150"),
            currency=Currency.COP,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=datetime(2026, 4, 3, tzinfo=timezone.utc),
            account_id=account.id,
            category_id=category.id,
        ),
    )
    assert updated_txn.description == "Compra ajustada"

    filtered_transactions = list_transactions(
        db_session,
        user.id,
        start_date=datetime(2026, 4, 2, tzinfo=timezone.utc),
        end_date=datetime(2026, 4, 3, tzinfo=timezone.utc),
    )
    assert [txn.id for txn in filtered_transactions] == [updated_txn.id]

    delete_transaction(db_session, user.id, updated_txn.id)

    remaining_transactions = list_transactions(db_session, user.id)
    assert [txn.id for txn in remaining_transactions] == [opening_txn.id]


def test_register_transaction_rejects_second_initial_balance(db_session):
    user = create_user(
        db_session,
        UserCreate(email="initial-balance@test.com", full_name="Initial Balance", password=TEST_PASSWORD),
    )
    bank = create_bank(db_session, user.id, BankCreate(name="Banco Inicial", country_code="CO"))
    account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Cuenta Inicial",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=bank.id,
        ),
    )

    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Saldo inicial",
            amount=Decimal("500"),
            currency=Currency.COP,
            transaction_type=TransactionType.INCOME,
            occurred_at=datetime.now(timezone.utc),
            account_id=account.id,
            is_initial_balance=True,
        ),
    )

    with pytest.raises(ValueError, match="El saldo inicial solo se puede registrar una vez por cuenta\."):
        register_transaction(
            db_session,
            user.id,
            TransactionCreate(
                description="Segundo saldo inicial",
                amount=Decimal("100"),
                currency=Currency.COP,
                transaction_type=TransactionType.INCOME,
                occurred_at=datetime.now(timezone.utc),
                account_id=account.id,
                is_initial_balance=True,
            ),
        )


def test_country_crud_lifecycle(db_session):
    created = create_country(db_session, CountryCreate(code="ar", name="Argentina"))
    assert created.code == "AR"
    assert created.name == "Argentina"

    listed = list_countries(db_session)
    assert any(country.id == created.id for country in listed)

    updated = update_country(
        db_session,
        created.id,
        CountryUpdate(code="uy", name="Uruguay"),
    )
    assert updated.code == "UY"
    assert updated.name == "Uruguay"

    delete_country(db_session, created.id)
    assert all(country.id != created.id for country in list_countries(db_session))


def test_country_rejects_duplicate_code_and_name(db_session):
    with pytest.raises(ValueError, match="Country code already exists"):
        create_country(db_session, CountryCreate(code="co", name="Canadá"))

    with pytest.raises(ValueError, match="Country name already exists"):
        create_country(db_session, CountryCreate(code="CA", name="Colombia"))

    with pytest.raises(ValueError, match="Country name already exists"):
        create_country(db_session, CountryCreate(code="BR", name="colombia"))


def test_country_update_validation_and_not_found(db_session):
    country = create_country(db_session, CountryCreate(code="CL", name="Chile"))
    create_country(db_session, CountryCreate(code="PE", name="Perú"))

    with pytest.raises(ValueError, match="At least one country field must be provided"):
        update_country(db_session, country.id, CountryUpdate())

    with pytest.raises(ValueError, match="Country code already exists"):
        update_country(db_session, country.id, CountryUpdate(code="PE"))

    with pytest.raises(ValueError, match="Country name already exists"):
        update_country(db_session, country.id, CountryUpdate(name="Perú"))

    with pytest.raises(ValueError, match="Country 9999 not found"):
        update_country(db_session, 9999, CountryUpdate(name="Inexistente"))

    with pytest.raises(ValueError, match="Country 9999 not found"):
        delete_country(db_session, 9999)


def test_create_bank_rejects_unknown_country_code(db_session):
    user = create_user(
        db_session,
        UserCreate(email="bank-country@test.com", full_name="Bank Country", password=TEST_PASSWORD),
    )

    with pytest.raises(ValueError, match="Country code is not registered in countries catalog"):
        create_bank(db_session, user.id, BankCreate(name="Banco Inválido", country_code="ZZ"))
