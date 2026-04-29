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


def test_migrate_categories_to_global_adds_missing_category_type_on_non_sqlite(monkeypatch):
    executed_sql = []

    class DummyConnection:
        def __init__(self):
            self.dialect = type("Dialect", (), {"name": "postgresql"})()

        def execute(self, statement):
            executed_sql.append(str(statement))

    class DummyEngine:
        def begin(self):
            connection = DummyConnection()

            class _Ctx:
                def __enter__(self):
                    return connection

                def __exit__(self, exc_type, exc, tb):
                    return False

            return _Ctx()

    class DummyInspector:
        def get_table_names(self):
            return ["categories"]

        def get_columns(self, table_name):
            assert table_name == "categories"
            return [{"name": "id"}, {"name": "name"}, {"name": "user_id"}]

        def get_foreign_keys(self, table_name):
            assert table_name == "categories"
            return [{"constrained_columns": ["user_id"], "name": "fk_categories_user_id"}]

    monkeypatch.setattr(init_db_module, "engine", DummyEngine())
    monkeypatch.setattr(init_db_module, "inspect", lambda _engine: DummyInspector())

    init_db_module._migrate_categories_to_global()

    assert any("DROP CONSTRAINT" in sql for sql in executed_sql)
    assert any("ADD COLUMN category_type" in sql for sql in executed_sql)
    assert any("DROP COLUMN user_id" in sql for sql in executed_sql)


def test_migrate_investments_to_entities_handles_schema_finalization(monkeypatch):
    driver_sql = []

    class DummyConnection:
        def exec_driver_sql(self, sql):
            driver_sql.append(sql)

    class DummyEngine:
        def begin(self):
            connection = DummyConnection()

            class _Ctx:
                def __enter__(self):
                    return connection

                def __exit__(self, exc_type, exc, tb):
                    return False

            return _Ctx()

    class DummyInspector:
        def __init__(self):
            self.columns_calls = 0

        def get_table_names(self):
            return ["investments", "investment_entities"]

        def get_columns(self, table_name):
            assert table_name == "investments"
            self.columns_calls += 1
            if self.columns_calls == 1:
                return [{"name": "id"}, {"name": "bank_id"}]
            return [{"name": "id"}, {"name": "bank_id"}, {"name": "investment_entity_id"}]

        def get_foreign_keys(self, table_name):
            assert table_name == "investments"
            return []

        def get_indexes(self, table_name):
            assert table_name == "investments"
            return []

    monkeypatch.setattr(init_db_module, "engine", DummyEngine())
    monkeypatch.setattr(init_db_module, "inspect", lambda _engine: DummyInspector())

    init_db_module._migrate_investments_to_entities()

    assert any("ADD COLUMN investment_entity_id" in sql for sql in driver_sql)
    assert any("INSERT INTO investment_entities" in sql for sql in driver_sql)
    assert any("UPDATE investments" in sql for sql in driver_sql)
    assert any("ALTER COLUMN investment_entity_id SET NOT NULL" in sql for sql in driver_sql)
    assert any("ADD CONSTRAINT investments_investment_entity_id_fkey" in sql for sql in driver_sql)
    assert any("CREATE INDEX ix_investments_investment_entity_id" in sql for sql in driver_sql)


def test_migrate_investments_to_entities_tolerates_unsupported_ddl(monkeypatch):
    driver_sql = []

    class DummyConnection:
        def exec_driver_sql(self, sql):
            driver_sql.append(sql)
            if "ALTER COLUMN investment_entity_id SET NOT NULL" in sql:
                raise RuntimeError("unsupported alter")
            if "ADD CONSTRAINT investments_investment_entity_id_fkey" in sql:
                raise RuntimeError("unsupported fk")
            if "CREATE INDEX ix_investments_investment_entity_id" in sql:
                raise RuntimeError("unsupported index")

    class DummyEngine:
        def begin(self):
            connection = DummyConnection()

            class _Ctx:
                def __enter__(self):
                    return connection

                def __exit__(self, exc_type, exc, tb):
                    return False

            return _Ctx()

    class DummyInspector:
        def get_table_names(self):
            return ["investments", "investment_entities"]

        def get_columns(self, _table_name):
            return [{"name": "id"}, {"name": "bank_id"}, {"name": "investment_entity_id"}]

        def get_foreign_keys(self, _table_name):
            return []

        def get_indexes(self, _table_name):
            return []

    monkeypatch.setattr(init_db_module, "engine", DummyEngine())
    monkeypatch.setattr(init_db_module, "inspect", lambda _engine: DummyInspector())

    init_db_module._migrate_investments_to_entities()

    assert any("ALTER COLUMN investment_entity_id SET NOT NULL" in sql for sql in driver_sql)
    assert any("ADD CONSTRAINT investments_investment_entity_id_fkey" in sql for sql in driver_sql)
    assert any("CREATE INDEX ix_investments_investment_entity_id" in sql for sql in driver_sql)
