import pytest

from app.db import seed
from app.models.account import Account
from app.models.bank import Bank
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User


def test_run_seed_creates_demo_data_and_is_idempotent(db_session, monkeypatch):
    monkeypatch.setattr(seed, "SessionLocal", lambda: db_session)

    seed.run_seed()

    demo = db_session.query(User).filter(User.email == seed.DEMO_EMAIL).first()
    assert demo is not None
    assert demo.full_name == seed.DEMO_FULL_NAME

    banks_count = db_session.query(Bank).count()
    accounts_count = db_session.query(Account).count()
    categories_count = db_session.query(Category).count()
    transactions_count = db_session.query(Transaction).count()

    assert banks_count >= 3
    assert accounts_count >= 4
    assert categories_count >= 10
    assert transactions_count >= 10

    # Second execution must not duplicate demo data.
    seed.run_seed()

    assert db_session.query(User).filter(User.email == seed.DEMO_EMAIL).count() == 1
    assert db_session.query(Bank).count() == banks_count
    assert db_session.query(Account).count() == accounts_count
    assert db_session.query(Category).count() == categories_count
    assert db_session.query(Transaction).count() == transactions_count


def test_run_seed_rolls_back_and_closes_session_on_failure(monkeypatch):
    class _QueryResult:
        def filter(self, *_args, **_kwargs):
            return self

        def first(self):
            return None

    class _FailingSession:
        def __init__(self):
            self.rollback_called = False
            self.close_called = False

        class _ScalarsResult:
            def all(self):
                return []

        def query(self, *_args, **_kwargs):
            return _QueryResult()

        def scalars(self, *_args, **_kwargs):
            return self._ScalarsResult()

        def add(self, *_args, **_kwargs):
            return None

        def flush(self):
            raise RuntimeError("flush failed")

        def commit(self):
            return None

        def rollback(self):
            self.rollback_called = True

        def close(self):
            self.close_called = True

    failing_db = _FailingSession()
    monkeypatch.setattr(seed, "SessionLocal", lambda: failing_db)

    with pytest.raises(RuntimeError, match="flush failed"):
        seed.run_seed()

    assert failing_db.rollback_called is True
    assert failing_db.close_called is True
