from sqlalchemy import inspect, text

from app.db.base import Base, engine
from app.models import (  # noqa: F401
    account,
    bank,
    category,
    country,
    investment,
    investment_entity,
    pocket,
    revoked_token,
    transaction,
    user,
)


def _migrate_categories_to_global() -> None:
    inspector = inspect(engine)
    if "categories" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("categories")}
    if "user_id" not in columns:
        return

    with engine.begin() as connection:
        if connection.dialect.name == "sqlite":
            connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
            connection.exec_driver_sql(
                """
                CREATE TABLE categories__tmp (
                    id INTEGER NOT NULL PRIMARY KEY,
                    name VARCHAR(120) NOT NULL,
                    description TEXT,
                    is_fixed BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.exec_driver_sql(
                """
                INSERT INTO categories__tmp (id, name, description, is_fixed, created_at)
                SELECT id, name, description, COALESCE(is_fixed, 0), created_at
                FROM categories
                """
            )
            connection.exec_driver_sql("DROP TABLE categories")
            connection.exec_driver_sql("ALTER TABLE categories__tmp RENAME TO categories")
            connection.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_categories_id ON categories (id)")
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
            return

        category_user_fk = next(
            (
                foreign_key
                for foreign_key in inspector.get_foreign_keys("categories")
                if "user_id" in foreign_key.get("constrained_columns", [])
            ),
            None,
        )
        if category_user_fk and category_user_fk.get("name"):
            connection.execute(text(f'ALTER TABLE categories DROP CONSTRAINT "{category_user_fk["name"]}"'))

        connection.execute(text("ALTER TABLE categories DROP COLUMN user_id"))


def _migrate_investments_to_entities() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "investments" not in table_names or "investment_entities" not in table_names:
        return

    investment_columns = {column["name"] for column in inspector.get_columns("investments")}
    if "bank_id" not in investment_columns:
        return

    with engine.begin() as connection:
        if "investment_entity_id" not in investment_columns:
            connection.exec_driver_sql("ALTER TABLE investments ADD COLUMN investment_entity_id INTEGER")

        connection.exec_driver_sql(
            """
            INSERT INTO investment_entities (name, entity_type, country_code, user_id)
            SELECT b.name, 'BANK', b.country_code, b.user_id
            FROM banks b
            WHERE b.id IN (SELECT DISTINCT i.bank_id FROM investments i WHERE i.bank_id IS NOT NULL)
            """
        )
        connection.exec_driver_sql(
            """
            UPDATE investments
            SET investment_entity_id = (
                SELECT ie.id
                FROM investment_entities ie
                JOIN banks b ON b.id = investments.bank_id
                WHERE ie.user_id = b.user_id
                  AND ie.name = b.name
                  AND ie.country_code = b.country_code
                  AND ie.entity_type = 'BANK'
                ORDER BY ie.id
                LIMIT 1
            )
            WHERE investment_entity_id IS NULL
            """
        )


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_categories_to_global()
    _migrate_investments_to_entities()
