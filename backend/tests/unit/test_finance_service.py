from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.models.enums import AccountType, Currency, TransactionType
from app.schemas.account import AccountCreate
from app.schemas.bank import BankCreate
from app.schemas.category import CategoryCreate
from app.schemas.country import CountryCreate, CountryUpdate
from app.schemas.investment import InvestmentCreate, InvestmentUpdate
from app.schemas.investment_entity import InvestmentEntityCreate, InvestmentEntityUpdate
from app.schemas.pocket import PocketCreate, PocketMoveCreate, PocketUpdate
from app.schemas.transaction import TransactionCreate, TransferCreate
from app.schemas.user import UserCreate
from app.services.auth_service import create_user
from app.services.finance_service import (
    create_account,
    create_bank,
    create_category,
    create_country,
    create_investment,
    create_investment_entity,
    create_pocket,
    create_transfer,
    delete_account,
    delete_bank,
    delete_category,
    delete_country,
    delete_investment,
    delete_investment_entity,
    delete_pocket,
    delete_transaction,
    get_dashboard_aggregates,
    get_dashboard_metrics,
    get_investment,
    get_pocket,
    list_accounts,
    list_categories,
    list_countries,
    list_investment_entities,
    list_investments,
    list_pockets,
    list_transactions,
    move_amount_to_pocket,
    register_transaction,
    update_account,
    update_bank,
    update_category,
    update_country,
    update_investment,
    update_investment_entity,
    update_pocket,
    update_transaction,
)

TEST_PASSWORD = "AtlasFinanceTestPwd123!"


def test_register_transaction_updates_balance_and_metrics(db_session, monkeypatch):
    # Validate that balance mutations and aggregate metrics stay consistent.
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


def test_pockets_lifecycle_and_account_scope_rules(db_session):
    # Ensure pocket CRUD honors ownership and cross-account currency constraints.
    user = create_user(
        db_session,
        UserCreate(email="pockets@test.com", full_name="Pockets", password=TEST_PASSWORD),
    )
    other_user = create_user(
        db_session,
        UserCreate(email="pockets-other@test.com", full_name="Pockets Other", password=TEST_PASSWORD),
    )

    user_bank = create_bank(db_session, user.id, BankCreate(name="Banco Usuario", country_code="CO"))
    other_bank = create_bank(db_session, other_user.id, BankCreate(name="Banco Otro", country_code="CO"))

    user_account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Cuenta Usuario",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=user_bank.id,
        ),
    )
    second_user_account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Cuenta Usuario 2",
            account_type=AccountType.CHECKING,
            currency=Currency.USD,
            current_balance=Decimal("0"),
            bank_id=user_bank.id,
        ),
    )
    other_account = create_account(
        db_session,
        other_user.id,
        AccountCreate(
            name="Cuenta Otro",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=other_bank.id,
        ),
    )

    pocket = create_pocket(
        db_session,
        user.id,
        PocketCreate(name="Viajes", balance=Decimal("250"), currency=Currency.COP, account_id=user_account.id),
    )

    fetched_pocket = get_pocket(db_session, user.id, pocket.id)
    assert fetched_pocket.id == pocket.id

    pockets = list_pockets(db_session, user.id)
    assert len(pockets) == 1
    assert pockets[0].id == pocket.id

    updated = update_pocket(
        db_session,
        user.id,
        pocket.id,
        PocketUpdate(
            name="Viajes 2026",
            account_id=user_account.id,
        ),
    )
    assert updated.name == "Viajes 2026"
    assert updated.balance == Decimal("250")

    with pytest.raises(ValueError, match="Cannot move pocket to account with different currency"):
        update_pocket(
            db_session,
            user.id,
            pocket.id,
            PocketUpdate(
                name="Viajes USD",
                account_id=second_user_account.id,
            ),
        )

    with pytest.raises(ValueError, match="Invalid account for user"):
        create_pocket(
            db_session,
            user.id,
            PocketCreate(name="No permitido", balance=Decimal("10"), currency=Currency.COP, account_id=other_account.id),
        )

    duplicate_name_payload = PocketCreate(
        name="Viajes 2026",
        balance=Decimal("50"),
        currency=Currency.COP,
        account_id=user_account.id,
    )
    with pytest.raises(ValueError, match="Pocket name already exists for account"):
        create_pocket(db_session, user.id, duplicate_name_payload)

    delete_pocket(db_session, user.id, pocket.id)
    assert list_pockets(db_session, user.id) == []

    with pytest.raises(ValueError, match="Pocket not found"):
        get_pocket(db_session, user.id, pocket.id)


def test_move_amount_to_pocket_updates_pocket_and_account_balance(db_session):
    user = create_user(
        db_session,
        UserCreate(email="pocket-move@test.com", full_name="Pocket Move", password=TEST_PASSWORD),
    )
    bank = create_bank(db_session, user.id, BankCreate(name="Banco Mover", country_code="CO"))
    account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Cuenta Operativa",
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
            account_id=account.id,
        ),
    )

    pocket = create_pocket(
        db_session,
        user.id,
        PocketCreate(name="Vacaciones", balance=Decimal("0"), currency=Currency.COP, account_id=account.id),
    )

    txn = move_amount_to_pocket(
        db_session,
        user.id,
        PocketMoveCreate(
            amount=Decimal("120"),
            account_id=account.id,
            pocket_id=pocket.id,
            occurred_at=datetime.now(timezone.utc),
        ),
    )

    refreshed_pocket = get_pocket(db_session, user.id, pocket.id)
    refreshed_account = next(item for item in list_accounts(db_session, user.id) if item.id == account.id)

    assert txn.pocket_id == pocket.id
    assert txn.transaction_type == TransactionType.EXPENSE
    assert txn.description == "Movimiento a Bolsillo Vacaciones"
    assert refreshed_pocket.balance == Decimal("120")
    assert refreshed_account.current_balance == Decimal("380")


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

    with pytest.raises(ValueError, match="Insufficient funds in the selected account\\."):
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

    with pytest.raises(ValueError, match="Transfer transactions cannot be edited\\."):
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


def test_delete_transaction_allows_transfer_transactions(db_session):
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

    delete_transaction(db_session, user.id, transfer_income.id)

    remaining_transactions = list_transactions(db_session, user.id)
    assert all(item.id != transfer_income.id for item in remaining_transactions)


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

    with pytest.raises(ValueError, match=r"Initial balance can only be registered once per account\."):
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


def test_investments_lifecycle_and_ownership_rules(db_session):
    user = create_user(
        db_session,
        UserCreate(email="invest@test.com", full_name="Investor", password=TEST_PASSWORD),
    )
    other_user = create_user(
        db_session,
        UserCreate(email="invest-other@test.com", full_name="Other", password=TEST_PASSWORD),
    )
    entity = create_investment_entity(
        db_session,
        user.id,
        InvestmentEntityCreate(name="Broker Principal", entity_type="broker", country_code="CO"),
    )
    other_entity = create_investment_entity(
        db_session,
        other_user.id,
        InvestmentEntityCreate(name="Broker Otro", entity_type="broker", country_code="CO"),
    )

    now = datetime.now(timezone.utc)

    inv = create_investment(
        db_session,
        user.id,
        InvestmentCreate(
            name="Fondo Renta",
            instrument_type="Fondos",
            amount_invested=Decimal("1000000"),
            current_value=Decimal("1100000"),
            currency=Currency.COP,
            investment_entity_id=entity.id,
            started_at=now,
        ),
    )
    assert inv.id is not None
    assert inv.amount_invested == Decimal("1000000")
    assert inv.current_value == Decimal("1100000")

    fetched = get_investment(db_session, user.id, inv.id)
    assert fetched.id == inv.id

    investments = list_investments(db_session, user.id)
    assert len(investments) == 1

    updated = update_investment(
        db_session,
        user.id,
        inv.id,
        InvestmentUpdate(
            name="Fondo Renta Actualizado",
            instrument_type="Fondos",
            current_value=Decimal("1200000"),
            investment_entity_id=entity.id,
            started_at=now,
        ),
    )
    assert updated.name == "Fondo Renta Actualizado"
    assert updated.current_value == Decimal("1200000")
    assert updated.amount_invested == Decimal("1000000")

    with pytest.raises(ValueError, match="Invalid investment entity for user"):
        create_investment(
            db_session,
            user.id,
            InvestmentCreate(
                name="Inversion no autorizada",
                instrument_type="Acciones",
                amount_invested=Decimal("500"),
                current_value=Decimal("500"),
                currency=Currency.COP,
                investment_entity_id=other_entity.id,
                started_at=now,
            ),
        )

    with pytest.raises(ValueError, match="Investment not found"):
        get_investment(db_session, other_user.id, inv.id)

    delete_investment(db_session, user.id, inv.id)
    assert list_investments(db_session, user.id) == []


def test_investment_entities_crud_and_ownership_rules(db_session):
    user = create_user(
        db_session,
        UserCreate(email="entities@test.com", full_name="Entities", password=TEST_PASSWORD),
    )
    other_user = create_user(
        db_session,
        UserCreate(email="entities-other@test.com", full_name="Other Entities", password=TEST_PASSWORD),
    )

    entity = create_investment_entity(
        db_session,
        user.id,
        InvestmentEntityCreate(name="Interactive Brokers", entity_type="broker", country_code="US"),
    )
    assert entity.id is not None
    assert entity.country_code == "US"

    entities = list_investment_entities(db_session, user.id)
    assert len(entities) == 1
    assert entities[0].id == entity.id

    updated_entity = update_investment_entity(
        db_session,
        user.id,
        entity.id,
        InvestmentEntityUpdate(name="IBKR", entity_type="broker", country_code="US"),
    )
    assert updated_entity.name == "IBKR"

    with pytest.raises(ValueError, match="Investment entity not found"):
        update_investment_entity(
            db_session,
            other_user.id,
            entity.id,
            InvestmentEntityUpdate(name="Hack", entity_type="other", country_code="US"),
        )

    delete_investment_entity(db_session, user.id, entity.id)
    assert list_investment_entities(db_session, user.id) == []


def test_create_transfer_success_and_validation_rules(db_session):
    user = create_user(
        db_session,
        UserCreate(email="transfer-rules@test.com", full_name="Transfer Rules", password=TEST_PASSWORD),
    )
    other_user = create_user(
        db_session,
        UserCreate(email="transfer-rules-other@test.com", full_name="Transfer Rules Other", password=TEST_PASSWORD),
    )

    user_bank = create_bank(db_session, user.id, BankCreate(name="Banco Transfer", country_code="CO"))
    other_bank = create_bank(db_session, other_user.id, BankCreate(name="Banco Otro", country_code="CO"))

    source_account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Origen Transfer",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=user_bank.id,
        ),
    )
    destination_account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Destino Transfer",
            account_type=AccountType.CHECKING,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=user_bank.id,
        ),
    )
    outsider_account = create_account(
        db_session,
        other_user.id,
        AccountCreate(
            name="Cuenta Externa",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=other_bank.id,
        ),
    )

    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Fondeo",
            amount=Decimal("700"),
            currency=Currency.COP,
            transaction_type=TransactionType.INCOME,
            occurred_at=datetime.now(timezone.utc),
            account_id=source_account.id,
        ),
    )

    with pytest.raises(ValueError, match="Source and destination accounts must be different"):
        create_transfer(
            db_session,
            user.id,
            TransferCreate(
                from_account_id=source_account.id,
                to_account_id=source_account.id,
                amount=Decimal("10"),
                occurred_at=datetime.now(timezone.utc),
            ),
        )

    with pytest.raises(ValueError, match="Destination account not found"):
        create_transfer(
            db_session,
            user.id,
            TransferCreate(
                from_account_id=source_account.id,
                to_account_id=outsider_account.id,
                amount=Decimal("10"),
                occurred_at=datetime.now(timezone.utc),
            ),
        )

    with pytest.raises(ValueError, match="Insufficient funds in the selected account\\."):
        create_transfer(
            db_session,
            user.id,
            TransferCreate(
                from_account_id=source_account.id,
                to_account_id=destination_account.id,
                amount=Decimal("900"),
                occurred_at=datetime.now(timezone.utc),
            ),
        )

    debit_txn, credit_txn = create_transfer(
        db_session,
        user.id,
        TransferCreate(
            from_account_id=source_account.id,
            to_account_id=destination_account.id,
            amount=Decimal("250"),
            occurred_at=datetime(2026, 4, 15, tzinfo=timezone.utc),
        ),
    )

    accounts = {item.id: item for item in list_accounts(db_session, user.id)}
    assert debit_txn.transaction_type == TransactionType.EXPENSE
    assert credit_txn.transaction_type == TransactionType.INCOME
    assert debit_txn.description.startswith("Transferencia: ")
    assert credit_txn.description == debit_txn.description
    assert accounts[source_account.id].current_balance == Decimal("450")
    assert accounts[destination_account.id].current_balance == Decimal("250")


def test_get_dashboard_aggregates_builds_expected_series_and_totals(db_session, monkeypatch):
    monkeypatch.setattr("app.services.finance_service.convert_currency", lambda amount, _f, _t: amount)

    user = create_user(
        db_session,
        UserCreate(email="aggregates@test.com", full_name="Aggregates", password=TEST_PASSWORD),
    )
    bank = create_bank(db_session, user.id, BankCreate(name="Banco Aggregates", country_code="CO"))
    account = create_account(
        db_session,
        user.id,
        AccountCreate(
            name="Cuenta Aggregates",
            account_type=AccountType.SAVINGS,
            currency=Currency.COP,
            current_balance=Decimal("0"),
            bank_id=bank.id,
        ),
    )

    fixed_category = create_category(
        db_session,
        CategoryCreate(name="Arriendo", description="Fijo", is_fixed=True),
    )
    variable_category = create_category(
        db_session,
        CategoryCreate(name="Comida", description="Variable", is_fixed=False),
    )
    extra_category = create_category(
        db_session,
        CategoryCreate(name="Ocio", description="Variable", is_fixed=False),
    )

    # Previous period
    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Salario marzo",
            amount=Decimal("900"),
            currency=Currency.COP,
            transaction_type=TransactionType.INCOME,
            occurred_at=datetime(2026, 3, 10, tzinfo=timezone.utc),
            account_id=account.id,
        ),
    )
    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Gasto marzo",
            amount=Decimal("300"),
            currency=Currency.COP,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=datetime(2026, 3, 12, tzinfo=timezone.utc),
            account_id=account.id,
            category_id=variable_category.id,
        ),
    )

    # Current period
    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Salario abril",
            amount=Decimal("1000"),
            currency=Currency.COP,
            transaction_type=TransactionType.INCOME,
            occurred_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
            account_id=account.id,
        ),
    )
    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Arriendo abril",
            amount=Decimal("400"),
            currency=Currency.COP,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=datetime(2026, 4, 2, tzinfo=timezone.utc),
            account_id=account.id,
            category_id=fixed_category.id,
        ),
    )
    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Comida abril",
            amount=Decimal("250"),
            currency=Currency.COP,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=datetime(2026, 4, 3, tzinfo=timezone.utc),
            account_id=account.id,
            category_id=variable_category.id,
        ),
    )
    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Ocio abril",
            amount=Decimal("150"),
            currency=Currency.COP,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=datetime(2026, 4, 4, tzinfo=timezone.utc),
            account_id=account.id,
            category_id=extra_category.id,
        ),
    )
    register_transaction(
        db_session,
        user.id,
        TransactionCreate(
            description="Sin categoria abril",
            amount=Decimal("50"),
            currency=Currency.COP,
            transaction_type=TransactionType.EXPENSE,
            occurred_at=datetime(2026, 4, 5, tzinfo=timezone.utc),
            account_id=account.id,
        ),
    )

    aggregates = get_dashboard_aggregates(
        db_session,
        user_id=user.id,
        start_date=datetime(2026, 4, 1, tzinfo=timezone.utc),
        end_date=datetime(2026, 4, 30, tzinfo=timezone.utc),
        target_currency="COP",
        prev_start_date=datetime(2026, 3, 1, tzinfo=timezone.utc),
        prev_end_date=datetime(2026, 3, 31, tzinfo=timezone.utc),
        top_n=1,
    )

    assert aggregates.income == Decimal("1000")
    assert aggregates.expenses == Decimal("850")
    assert aggregates.transaction_count == 5
    assert aggregates.prev_income == Decimal("900")
    assert aggregates.prev_expenses == Decimal("300")
    assert aggregates.fixed_total == Decimal("400")
    assert aggregates.biggest_expense_amount == Decimal("400")
    assert aggregates.biggest_expense_description == "Arriendo abril"

    assert len(aggregates.monthly) == 1
    assert aggregates.monthly[0].month == "2026-04"
    assert aggregates.monthly[0].cashflow == Decimal("150")

    assert len(aggregates.top_categories) == 1
    assert aggregates.top_categories[0].name == "Arriendo"
    assert aggregates.top_categories[0].is_fixed is True

    assert "Arriendo" in aggregates.stacked_cats
    assert "Otras" in aggregates.stacked_cats
    assert len(aggregates.stacked) == 1
    assert aggregates.stacked[0].month == "2026-04"
    assert aggregates.stacked[0].categories["Arriendo"] == Decimal("400")
    assert aggregates.stacked[0].categories["Otras"] == Decimal("450")
