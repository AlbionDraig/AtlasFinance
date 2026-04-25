import pytest
from fastapi import HTTPException, status

from app.api.error_handlers import (
    raise_bad_request_from_value_error,
    raise_domain_value_error,
    raise_not_found_from_value_error,
)
from app.db import base


def test_raise_bad_request_from_value_error_returns_400():
    with pytest.raises(HTTPException) as exc_info:
        raise_bad_request_from_value_error(ValueError("invalid payload"))

    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert exc_info.value.detail == "invalid payload"


def test_raise_domain_value_error_returns_404_for_known_not_found_message():
    with pytest.raises(HTTPException) as exc_info:
        raise_domain_value_error(
            ValueError("Category not found"),
            not_found_messages={"Category not found", "Account not found"},
        )

    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
    assert exc_info.value.detail == "Category not found"


def test_raise_domain_value_error_returns_400_for_other_messages():
    with pytest.raises(HTTPException) as exc_info:
        raise_domain_value_error(
            ValueError("invalid amount"),
            not_found_messages={"Category not found", "Account not found"},
        )

    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert exc_info.value.detail == "invalid amount"


def test_raise_not_found_from_value_error_returns_404():
    with pytest.raises(HTTPException) as exc_info:
        raise_not_found_from_value_error(ValueError("missing"))

    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
    assert exc_info.value.detail == "missing"


def test_get_db_yields_session_and_closes_it(monkeypatch):
    class _DummySession:
        def __init__(self):
            self.closed = False

        def close(self):
            self.closed = True

    dummy = _DummySession()
    monkeypatch.setattr(base, "SessionLocal", lambda: dummy)

    db_gen = base.get_db()
    yielded = next(db_gen)
    assert yielded is dummy

    with pytest.raises(StopIteration):
        next(db_gen)

    assert dummy.closed is True
