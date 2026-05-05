"""Tests for uncovered edge cases in services and core modules.

Targets:
- app.core.rate_limit: _key_func with X-Forwarded-For, handler with generic exception
- app.services._common: expired cache, get_user not found, persist_and_refresh
- app.services.accounts_service: all ValueError branches
- app.services.pockets_service: all ValueError branches
- app.services.transactions_service: pocket/category validation, transfer errors
"""
import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import patch

import pytest

from app.core.rate_limit import _key_func, rate_limit_exceeded_handler
from app.models.enums import AccountType, Currency, TransactionType
from app.schemas.account import AccountCreate, AccountUpdate
from app.schemas.bank import BankCreate
from app.schemas.pocket import PocketCreate, PocketMoveCreate, PocketUpdate, PocketWithdrawCreate
from app.schemas.transaction import TransactionCreate, TransferCreate
from app.schemas.user import UserCreate
from app.services._common import (
    get_cached_metrics,
    get_user,
    persist_and_refresh,
    set_cached_metrics,
)
from app.services.accounts_service import create_account, delete_account, update_account
from app.services.auth_service import create_user
from app.services.banks_service import create_bank
from app.services.pockets_service import (
    create_pocket,
    delete_pocket,
    get_pocket,
    move_amount_to_pocket,
    update_pocket,
    withdraw_amount_from_pocket,
)
from app.services.transactions_service import (
    create_transfer,
    register_transaction,
    update_transaction,
)

TEST_PASSWORD = "AtlasFinanceTestPwd123!"
NOW = datetime.now(timezone.utc)


# ─── Helpers ────────────────────────────────────────────────────────────────

def _make_user_bank_account(db, suffix: str):
    """Create a user, a bank and a checking account for that user."""
    user = create_user(db, UserCreate(email=f"{suffix}@edge.com", full_name="Edge", password=TEST_PASSWORD))
    bank = create_bank(db, user.id, BankCreate(name=f"Bank{suffix}", country_code="CO"))
    account = create_account(
        db, user.id,
        AccountCreate(name="Acc", account_type=AccountType.CHECKING, currency=Currency.USD, bank_id=bank.id),
    )
    return user, bank, account


def _income(db, user_id: int, account_id: int, amount: Decimal = Decimal("1000")):
    """Register an income transaction to fund an account."""
    return register_transaction(
        db, user_id,
        TransactionCreate(
            description="Seed income",
            amount=amount,
            currency=Currency.USD,
            transaction_type=TransactionType.INCOME,
            occurred_at=NOW,
            account_id=account_id,
            is_initial_balance=True,
        ),
    )


def _make_user_with_pocket(db, suffix: str):
    """Create a user, bank, funded account and pocket."""
    user, bank, account = _make_user_bank_account(db, suffix)
    _income(db, user.id, account.id)
    pocket = create_pocket(
        db, user.id,
        PocketCreate(name="Pocket", balance=Decimal("0"), currency=Currency.USD, account_id=account.id),
    )
    return user, bank, account, pocket


# ─── rate_limit.py ──────────────────────────────────────────────────────────

def test_key_func_uses_x_forwarded_for():
    """_key_func returns the first IP from X-Forwarded-For chain."""
    from starlette.requests import Request

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(b"x-forwarded-for", b"10.0.0.1, 192.168.1.1")],
        "query_string": b"",
    }
    request = Request(scope)
    assert _key_func(request) == "10.0.0.1"


def test_key_func_single_forwarded_ip():
    """_key_func works when X-Forwarded-For has a single entry."""
    from starlette.requests import Request

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(b"x-forwarded-for", b"203.0.113.5")],
        "query_string": b"",
    }
    request = Request(scope)
    assert _key_func(request) == "203.0.113.5"


def test_rate_limit_exceeded_handler_generic_exception():
    """handler returns 429 with 'Too Many Requests' for non-RateLimitExceeded exceptions."""
    import json

    from starlette.requests import Request

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [],
        "query_string": b"",
    }
    request = Request(scope)
    exc = RuntimeError("some error")

    loop = asyncio.new_event_loop()
    try:
        response = loop.run_until_complete(rate_limit_exceeded_handler(request, exc))
    finally:
        loop.close()

    assert response.status_code == 429
    body = json.loads(response.body)
    assert "Too Many Requests" in body["detail"]


# ─── _common.py ─────────────────────────────────────────────────────────────

def test_get_cached_metrics_expired():
    """get_cached_metrics returns None and clears the entry when TTL has elapsed."""
    from app.schemas.metric import DashboardMetrics

    metrics = DashboardMetrics(
        net_worth=Decimal("500"),
        total_income=Decimal("1000"),
        total_expenses=Decimal("500"),
        savings_rate=Decimal("50"),
        cashflow=Decimal("500"),
    )
    set_cached_metrics(77777, "USD", metrics)

    # Simulate elapsed time so the entry appears expired
    with patch("app.services._common.monotonic", return_value=float("inf")):
        result = get_cached_metrics(77777, "USD")

    assert result is None
    # Entry must have been evicted — second call also returns None
    assert get_cached_metrics(77777, "USD") is None


def test_get_user_not_found(db_session):
    """get_user raises ValueError when the user_id does not exist."""
    with pytest.raises(ValueError, match="User not found"):
        get_user(db_session, user_id=99999)


def test_persist_and_refresh_creates_and_returns_instance(db_session):
    """persist_and_refresh persists a new model instance and returns it refreshed."""
    from app.core.security import get_password_hash
    from app.models.user import User

    user = User(
        email="persist_test@edge.com",
        full_name="Persist",
        hashed_password=get_password_hash("Passwd123!"),
    )
    result = persist_and_refresh(db_session, user)
    assert result.id is not None
    assert result.email == "persist_test@edge.com"


# ─── accounts_service.py ────────────────────────────────────────────────────

def test_create_account_invalid_bank(db_session):
    """create_account raises ValueError when bank_id does not belong to the user."""
    user, _, _ = _make_user_bank_account(db_session, "cacc_invbank")
    with pytest.raises(ValueError, match="Invalid bank for user"):
        create_account(
            db_session, user.id,
            AccountCreate(name="TestAcc", account_type=AccountType.CHECKING, currency=Currency.USD, bank_id=9999),
        )


def test_update_account_not_found(db_session):
    """update_account raises ValueError when account_id does not exist for the user."""
    user, bank, _ = _make_user_bank_account(db_session, "uacc_notfound")
    with pytest.raises(ValueError, match="Account not found"):
        update_account(
            db_session, user.id, account_id=9999,
            payload=AccountUpdate(name="NewName", account_type=AccountType.CHECKING, currency=Currency.USD, bank_id=bank.id),
        )


def test_update_account_invalid_bank(db_session):
    """update_account raises ValueError when destination bank_id is not owned by user."""
    user, bank, account = _make_user_bank_account(db_session, "uacc_invbank")
    with pytest.raises(ValueError, match="Invalid bank for user"):
        update_account(
            db_session, user.id, account_id=account.id,
            payload=AccountUpdate(name="NewName", account_type=AccountType.CHECKING, currency=Currency.USD, bank_id=9999),
        )


def test_delete_account_not_found(db_session):
    """delete_account raises ValueError when the account does not exist for the user."""
    user, _, _ = _make_user_bank_account(db_session, "dacc_notfound")
    with pytest.raises(ValueError, match="Account not found"):
        delete_account(db_session, user.id, account_id=9999)


# ─── pockets_service.py ─────────────────────────────────────────────────────

def test_create_pocket_currency_mismatch(db_session):
    """create_pocket raises ValueError when pocket currency differs from account currency (USD account, COP pocket)."""
    user, _, account = _make_user_bank_account(db_session, "cpkt_curr")
    with pytest.raises(ValueError, match="Pocket currency must match account currency"):
        create_pocket(
            db_session, user.id,
            PocketCreate(name="CopPocket", balance=Decimal("0"), currency=Currency.COP, account_id=account.id),
        )


def test_get_pocket_not_found(db_session):
    """get_pocket raises ValueError when the pocket does not exist for the user."""
    user, _, _, _ = _make_user_with_pocket(db_session, "gpkt_nf")
    with pytest.raises(ValueError, match="Pocket not found"):
        get_pocket(db_session, user.id, pocket_id=9999)


def test_update_pocket_not_found(db_session):
    """update_pocket raises ValueError when pocket_id does not exist for the user."""
    user, _, account = _make_user_bank_account(db_session, "upkt_nf")
    with pytest.raises(ValueError, match="Pocket not found"):
        update_pocket(
            db_session, user.id, pocket_id=9999,
            payload=PocketUpdate(name="New", account_id=account.id),
        )


def test_update_pocket_currency_mismatch(db_session):
    """update_pocket raises ValueError when moving pocket to account with different currency."""
    user, bank, account_usd = _make_user_bank_account(db_session, "upkt_curr")
    account_cop = create_account(
        db_session, user.id,
        AccountCreate(name="CopAcc", account_type=AccountType.SAVINGS, currency=Currency.COP, bank_id=bank.id),
    )
    pocket = create_pocket(
        db_session, user.id,
        PocketCreate(name="UsdPocket", balance=Decimal("0"), currency=Currency.USD, account_id=account_usd.id),
    )
    with pytest.raises(ValueError, match="Cannot move pocket to account with different currency"):
        update_pocket(
            db_session, user.id, pocket_id=pocket.id,
            payload=PocketUpdate(name="UsdPocket", account_id=account_cop.id),
        )


def test_update_pocket_duplicate_name(db_session):
    """update_pocket raises ValueError when the new name already exists in the target account."""
    user, _, account = _make_user_bank_account(db_session, "upkt_dup")
    create_pocket(db_session, user.id, PocketCreate(name="Alpha", balance=Decimal("0"), currency=Currency.USD, account_id=account.id))
    pocket_b = create_pocket(db_session, user.id, PocketCreate(name="Beta", balance=Decimal("0"), currency=Currency.USD, account_id=account.id))
    with pytest.raises(ValueError, match="Pocket name already exists for account"):
        update_pocket(
            db_session, user.id, pocket_id=pocket_b.id,
            payload=PocketUpdate(name="Alpha", account_id=account.id),
        )


def test_delete_pocket_not_found(db_session):
    """delete_pocket raises ValueError when the pocket does not exist for the user."""
    user, _, _, _ = _make_user_with_pocket(db_session, "dpkt_nf")
    with pytest.raises(ValueError, match="Pocket not found"):
        delete_pocket(db_session, user.id, pocket_id=9999)


def test_move_amount_to_pocket_invalid_account(db_session):
    """move_amount_to_pocket raises ValueError when account_id is not owned by the user."""
    user, _, _, pocket = _make_user_with_pocket(db_session, "movpkt_invacct")
    with pytest.raises(ValueError, match="Invalid account for user"):
        move_amount_to_pocket(
            db_session, user.id,
            PocketMoveCreate(account_id=9999, pocket_id=pocket.id, amount=Decimal("10"), occurred_at=NOW),
        )


def test_withdraw_from_pocket_invalid_account(db_session):
    """withdraw_amount_from_pocket raises ValueError when AccountRepository.get_owned returns None."""
    from unittest.mock import MagicMock, patch

    user, _, _, pocket = _make_user_with_pocket(db_session, "wdpkt_invacct")
    # Add some balance so the amount check passes
    pocket.balance = Decimal("100")
    db_session.commit()

    with patch("app.services.pockets_service.AccountRepository") as MockRepo:
        mock_instance = MagicMock()
        MockRepo.return_value = mock_instance
        mock_instance.get_owned.return_value = None

        with pytest.raises(ValueError, match="Invalid account for user"):
            withdraw_amount_from_pocket(
                db_session, user.id,
                PocketWithdrawCreate(pocket_id=pocket.id, amount=Decimal("1"), occurred_at=NOW),
            )


# ─── transactions_service.py ────────────────────────────────────────────────

def test_register_transaction_pocket_not_belonging_to_account(db_session):
    """_validate_transaction_payload raises ValueError when pocket belongs to a different account."""
    user, bank, account = _make_user_bank_account(db_session, "txn_pkt_err")
    bank2 = create_bank(db_session, user.id, BankCreate(name="Bank2txnerr", country_code="CO"))
    account2 = create_account(
        db_session, user.id,
        AccountCreate(name="Acc2", account_type=AccountType.CHECKING, currency=Currency.USD, bank_id=bank2.id),
    )
    _income(db_session, user.id, account.id)
    _income(db_session, user.id, account2.id)
    pocket = create_pocket(
        db_session, user.id,
        PocketCreate(name="OtherPocket", balance=Decimal("0"), currency=Currency.USD, account_id=account2.id),
    )
    with pytest.raises(ValueError, match="Pocket does not belong to account"):
        register_transaction(
            db_session, user.id,
            TransactionCreate(
                description="Bad pocket",
                amount=Decimal("10"),
                currency=Currency.USD,
                transaction_type=TransactionType.EXPENSE,
                occurred_at=NOW,
                account_id=account.id,
                pocket_id=pocket.id,  # pocket belongs to account2
            ),
        )


def test_register_transaction_invalid_category(db_session):
    """_validate_transaction_payload raises ValueError when category_id does not exist."""
    user, _, account = _make_user_bank_account(db_session, "txn_cat_err")
    _income(db_session, user.id, account.id)
    with pytest.raises(ValueError, match="Invalid category"):
        register_transaction(
            db_session, user.id,
            TransactionCreate(
                description="Bad category",
                amount=Decimal("10"),
                currency=Currency.USD,
                transaction_type=TransactionType.EXPENSE,
                occurred_at=NOW,
                account_id=account.id,
                category_id=9999,
            ),
        )


def test_update_transaction_not_found(db_session):
    """update_transaction raises ValueError when the transaction does not belong to the user."""
    user, _, account = _make_user_bank_account(db_session, "upd_txn_nf")
    with pytest.raises(ValueError, match="Transaction not found"):
        update_transaction(
            db_session, user.id, transaction_id=9999,
            payload=TransactionCreate(
                description="Updated desc",
                amount=Decimal("10"),
                currency=Currency.USD,
                transaction_type=TransactionType.EXPENSE,
                occurred_at=NOW,
                account_id=account.id,
            ),
        )


def test_create_transfer_destination_account_not_found(db_session):
    """create_transfer raises ValueError when to_account_id does not belong to the user."""
    user, _, account = _make_user_bank_account(db_session, "trf_dst_nf")
    _income(db_session, user.id, account.id)
    with pytest.raises(ValueError, match="Destination account not found"):
        create_transfer(
            db_session, user.id,
            TransferCreate(
                from_account_id=account.id,
                to_account_id=9999,
                amount=Decimal("100"),
                occurred_at=NOW,
            ),
        )


def test_create_transfer_source_account_not_found(db_session):
    """create_transfer raises ValueError when from_account_id does not belong to the user."""
    user, _, account = _make_user_bank_account(db_session, "trf_src_nf")
    with pytest.raises(ValueError, match="Source account not found"):
        create_transfer(
            db_session, user.id,
            TransferCreate(
                from_account_id=9999,
                to_account_id=account.id,
                amount=Decimal("100"),
                occurred_at=NOW,
            ),
        )


def test_validate_transaction_payload_invalid_account(db_session):
    """register_transaction raises ValueError when account_id does not belong to the user."""
    user, _, _ = _make_user_bank_account(db_session, "txn_inv_acct")
    with pytest.raises(ValueError, match="Invalid account for user"):
        register_transaction(
            db_session, user.id,
            TransactionCreate(
                description="Bad account",
                amount=Decimal("10"),
                currency=Currency.USD,
                transaction_type=TransactionType.INCOME,
                occurred_at=NOW,
                account_id=9999,
            ),
        )


def test_update_pocket_invalid_account(db_session):
    """update_pocket raises ValueError when payload.account_id is not owned by the user."""
    user, _, account = _make_user_bank_account(db_session, "upkt_invacct")
    pocket = create_pocket(
        db_session, user.id,
        PocketCreate(name="MyPocket", balance=Decimal("0"), currency=Currency.USD, account_id=account.id),
    )
    with pytest.raises(ValueError, match="Invalid account for user"):
        update_pocket(
            db_session, user.id, pocket_id=pocket.id,
            payload=PocketUpdate(name="MyPocket", account_id=9999),
        )


def test_move_amount_to_pocket_currency_mismatch(db_session):
    """move_amount_to_pocket raises ValueError when pocket currency does not match account currency."""

    user, _, _, pocket = _make_user_with_pocket(db_session, "movpkt_curr")

    # Tamper the pocket currency so it mismatches the account (USD account, COP pocket)
    pocket.currency = Currency.COP
    db_session.commit()

    with pytest.raises(ValueError, match="Pocket currency must match account currency"):
        move_amount_to_pocket(
            db_session, user.id,
            PocketMoveCreate(
                account_id=pocket.account_id,
                pocket_id=pocket.id,
                amount=Decimal("10"),
                occurred_at=NOW,
            ),
        )
