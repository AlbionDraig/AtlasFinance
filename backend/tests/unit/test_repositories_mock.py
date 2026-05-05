"""Tests unitarios de la capa Repository usando mocks de Session.

Estos tests aislan la logica de los repositorios sin necesidad de una BD real,
verificando contratos con SQLAlchemy (db.get, db.scalar, db.scalars, db.add,
db.commit, db.refresh) mediante MagicMock.
"""
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.models.enums import TransactionType
from app.repositories.accounts import AccountRepository
from app.repositories.base import BaseRepository
from app.repositories.countries import CountryRepository
from app.repositories.pockets import PocketRepository
from app.repositories.transactions import TransactionRepository
from app.repositories.users import UserRepository
from app.services._common import (
    _balance_delta,
    apply_transaction_effect,
    ensure_sufficient_funds,
    get_cached_metrics,
    invalidate_metrics_cache,
    revert_transaction_effect,
    set_cached_metrics,
)

# --------------------------------------------------------------------------- #
# BaseRepository                                                              #
# --------------------------------------------------------------------------- #


class _DummyModel:
    """Stand-in para un modelo SQLAlchemy en BaseRepository."""


class _DummyRepo(BaseRepository[_DummyModel]):
    model = _DummyModel


def test_base_repo_get_delegates_to_session() -> None:
    db = MagicMock()
    sentinel = object()
    db.get.return_value = sentinel

    result = _DummyRepo(db).get(42)

    db.get.assert_called_once_with(_DummyModel, 42)
    assert result is sentinel


def test_base_repo_add_commits_and_refreshes() -> None:
    db = MagicMock()
    instance = object()

    result = _DummyRepo(db).add(instance)

    db.add.assert_called_once_with(instance)
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(instance)
    assert result is instance


def test_base_repo_commit_refresh_skips_add() -> None:
    db = MagicMock()
    instance = object()

    _DummyRepo(db).commit_refresh(instance)

    db.add.assert_not_called()
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(instance)


def test_base_repo_delete_removes_and_commits() -> None:
    db = MagicMock()
    instance = object()

    _DummyRepo(db).delete(instance)

    db.delete.assert_called_once_with(instance)
    db.commit.assert_called_once()


# --------------------------------------------------------------------------- #
# UserRepository                                                              #
# --------------------------------------------------------------------------- #


def test_user_repo_get_by_email_uses_filter_chain() -> None:
    db = MagicMock()
    expected_user = object()
    db.query.return_value.filter.return_value.first.return_value = expected_user

    result = UserRepository(db).get_by_email("foo@bar.com")

    assert result is expected_user
    db.query.assert_called_once()


# --------------------------------------------------------------------------- #
# AccountRepository                                                           #
# --------------------------------------------------------------------------- #


def test_account_repo_get_owned_returns_none_when_not_found() -> None:
    db = MagicMock()
    db.get.return_value = None

    assert AccountRepository(db).get_owned(user_id=1, account_id=99) is None


def test_account_repo_get_owned_blocks_other_user() -> None:
    db = MagicMock()
    foreign = MagicMock()
    foreign.bank.user_id = 2
    db.get.return_value = foreign

    assert AccountRepository(db).get_owned(user_id=1, account_id=10) is None


def test_account_repo_get_owned_returns_account_for_owner() -> None:
    db = MagicMock()
    own = MagicMock()
    own.bank.user_id = 7
    db.get.return_value = own

    assert AccountRepository(db).get_owned(user_id=7, account_id=10) is own


def test_account_repo_list_by_user_uses_scalars() -> None:
    db = MagicMock()
    db.scalars.return_value.all.return_value = ["a", "b"]

    result = AccountRepository(db).list_by_user(user_id=1, search="bbva")

    assert result == ["a", "b"]
    db.scalars.assert_called_once()


# --------------------------------------------------------------------------- #
# PocketRepository                                                            #
# --------------------------------------------------------------------------- #


def test_pocket_repo_get_owned_blocks_foreign_user() -> None:
    db = MagicMock()
    pocket = MagicMock()
    pocket.account.bank.user_id = 99
    db.get.return_value = pocket

    assert PocketRepository(db).get_owned(user_id=1, pocket_id=5) is None


def test_pocket_repo_find_duplicate_name_excludes_id() -> None:
    db = MagicMock()
    db.scalar.return_value = 42

    result = PocketRepository(db).find_duplicate_name(
        account_id=1, name="Ahorros", exclude_pocket_id=10
    )

    assert result == 42
    db.scalar.assert_called_once()


# --------------------------------------------------------------------------- #
# TransactionRepository                                                       #
# --------------------------------------------------------------------------- #


def test_transaction_repo_get_owned_blocks_other_user() -> None:
    db = MagicMock()
    txn = MagicMock()
    txn.user_id = 2
    db.get.return_value = txn

    assert TransactionRepository(db).get_owned(user_id=1, transaction_id=3) is None


def test_transaction_repo_first_id_for_account_returns_scalar() -> None:
    db = MagicMock()
    db.scalar.return_value = 7

    result = TransactionRepository(db).first_id_for_account(user_id=1, account_id=2)

    assert result == 7


def test_transaction_repo_find_mirror_transfer_id_uses_opposite_type() -> None:
    db = MagicMock()
    db.scalar.return_value = 99
    txn = MagicMock()
    txn.transaction_type = TransactionType.EXPENSE

    result = TransactionRepository(db).find_mirror_transfer_id(txn)

    assert result == 99
    db.scalar.assert_called_once()


def test_transaction_repo_add_pending_does_not_commit() -> None:
    db = MagicMock()
    instance = object()

    TransactionRepository(db).add_pending(instance)

    db.add.assert_called_once_with(instance)
    db.commit.assert_not_called()


# --------------------------------------------------------------------------- #
# CountryRepository                                                           #
# --------------------------------------------------------------------------- #


def test_country_repo_code_exists_true_when_id_returned() -> None:
    db = MagicMock()
    db.scalar.return_value = 1

    assert CountryRepository(db).code_exists("US") is True


def test_country_repo_code_exists_false_when_none() -> None:
    db = MagicMock()
    db.scalar.return_value = None

    assert CountryRepository(db).code_exists("ZZ") is False


# --------------------------------------------------------------------------- #
# services._common dispatch & helpers                                         #
# --------------------------------------------------------------------------- #


def test_balance_delta_income_positive() -> None:
    assert _balance_delta(TransactionType.INCOME, Decimal("10")) == Decimal("10")


def test_balance_delta_expense_negative() -> None:
    assert _balance_delta(TransactionType.EXPENSE, Decimal("10")) == Decimal("-10")


def test_balance_delta_unsupported_raises() -> None:
    with pytest.raises(ValueError, match="Unsupported transaction type"):
        _balance_delta("BOGUS", Decimal("1"))  # type: ignore[arg-type]


def test_apply_transaction_effect_increases_on_income() -> None:
    account = MagicMock()
    account.current_balance = Decimal("100")

    apply_transaction_effect(account, TransactionType.INCOME, Decimal("25"))

    assert account.current_balance == Decimal("125")


def test_apply_transaction_effect_decreases_on_expense() -> None:
    account = MagicMock()
    account.current_balance = Decimal("100")

    apply_transaction_effect(account, TransactionType.EXPENSE, Decimal("30"))

    assert account.current_balance == Decimal("70")


def test_revert_transaction_effect_inverse_of_apply() -> None:
    account = MagicMock()
    account.current_balance = Decimal("100")

    apply_transaction_effect(account, TransactionType.EXPENSE, Decimal("40"))
    revert_transaction_effect(account, TransactionType.EXPENSE, Decimal("40"))

    assert account.current_balance == Decimal("100")


def test_ensure_sufficient_funds_blocks_expense_over_balance() -> None:
    account = MagicMock()
    account.current_balance = Decimal("10")

    with pytest.raises(ValueError, match="Insufficient funds"):
        ensure_sufficient_funds(account, TransactionType.EXPENSE, Decimal("20"))


def test_ensure_sufficient_funds_allows_income_regardless() -> None:
    account = MagicMock()
    account.current_balance = Decimal("0")

    # No debe lanzar para ingresos aunque el saldo sea cero.
    ensure_sufficient_funds(account, TransactionType.INCOME, Decimal("999"))


# --------------------------------------------------------------------------- #
# Cache de metricas (in-process)                                              #
# --------------------------------------------------------------------------- #


def test_metrics_cache_set_and_get_roundtrip() -> None:
    invalidate_metrics_cache(user_id=123)

    snapshot = MagicMock()
    set_cached_metrics(123, "USD", snapshot)

    assert get_cached_metrics(123, "USD") is snapshot


def test_metrics_cache_invalidate_clears_user_keys() -> None:
    snapshot = MagicMock()
    set_cached_metrics(321, "USD", snapshot)
    set_cached_metrics(321, "EUR", snapshot)

    invalidate_metrics_cache(user_id=321)

    assert get_cached_metrics(321, "USD") is None
    assert get_cached_metrics(321, "EUR") is None


def test_metrics_cache_miss_returns_none() -> None:
    invalidate_metrics_cache(user_id=999)
    assert get_cached_metrics(999, "USD") is None
