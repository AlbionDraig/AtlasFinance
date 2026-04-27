import pytest
from fastapi import HTTPException, status
from sqlalchemy import create_engine, inspect, text

from app.api.error_handlers import (
    raise_bad_request_from_value_error,
    raise_domain_value_error,
    raise_not_found_from_value_error,
)
from app.db import base
from app.db import init_db as init_db_module


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


def test_init_db_migrates_categories_to_global_schema(monkeypatch):
    engine = create_engine("sqlite+pysqlite:///:memory:")

    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR(255), full_name VARCHAR(255), hashed_password VARCHAR(255), created_at DATETIME)"))
        connection.execute(text("INSERT INTO users (id, email, full_name, hashed_password) VALUES (1, 'legacy@test.com', 'Legacy', 'hash')"))
        connection.execute(
            text(
                """
                CREATE TABLE categories (
                    id INTEGER NOT NULL PRIMARY KEY,
                    name VARCHAR(120) NOT NULL,
                    description TEXT,
                    is_fixed BOOLEAN NOT NULL DEFAULT 0,
                    user_id INTEGER NOT NULL,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
                )
                """
            )
        )
        connection.execute(
            text(
                "INSERT INTO categories (id, name, description, is_fixed, user_id) VALUES (1, 'Legacy category', 'before migration', 1, 1)"
            )
        )

    monkeypatch.setattr(init_db_module, "engine", engine)

    init_db_module.init_db()

    columns = {column["name"] for column in inspect(engine).get_columns("categories")}
    assert "user_id" not in columns

    with engine.begin() as connection:
        count = connection.execute(text("SELECT COUNT(*) FROM categories WHERE id = 1 AND name = 'Legacy category'"))
        assert count.scalar_one() == 1
