import os

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
    """Migrate legacy categories schema from user-scoped to global catalog.

    Older versions stored ``user_id`` in ``categories``. New schema removes
    that ownership and keeps categories globally available.
    """
    inspector = inspect(engine)
    if "categories" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("categories")}
    has_user_id = "user_id" in columns
    has_category_type = "category_type" in columns
    if not has_user_id and has_category_type:
        return

    with engine.begin() as connection:
        if connection.dialect.name == "sqlite":
            # SQLite cannot drop/add constrained columns directly, so table rebuild is required.
            connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
            connection.exec_driver_sql(
                """
                CREATE TABLE categories__tmp (
                    id INTEGER NOT NULL PRIMARY KEY,
                    name VARCHAR(120) NOT NULL,
                    description TEXT,
                    is_fixed BOOLEAN NOT NULL DEFAULT 0,
                    category_type VARCHAR(20) NOT NULL DEFAULT 'any',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            if has_category_type:
                connection.exec_driver_sql(
                    """
                    INSERT INTO categories__tmp (id, name, description, is_fixed, category_type, created_at)
                    SELECT id, name, description, COALESCE(is_fixed, 0),
                           COALESCE(category_type, 'any'),
                           created_at
                    FROM categories
                    """
                )
            else:
                connection.exec_driver_sql(
                    """
                    INSERT INTO categories__tmp (id, name, description, is_fixed, category_type, created_at)
                    SELECT id, name, description, COALESCE(is_fixed, 0),
                           'any',
                           created_at
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

        if not has_category_type:
            connection.execute(text("ALTER TABLE categories ADD COLUMN category_type VARCHAR(20) NOT NULL DEFAULT 'any'"))
        if has_user_id:
            connection.execute(text("ALTER TABLE categories DROP COLUMN user_id"))


def _migrate_investments_to_entities() -> None:
    """Backfill investment entities from bank-linked investments.

    Legacy rows reference ``bank_id`` directly. This migration creates/links
    ``investment_entity_id`` and keeps compatibility across dialects.
    """
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

        # Finalize schema: make investment_entity_id NOT NULL, bank_id nullable, add FK+index
        cols = {column["name"] for column in inspector.get_columns("investments")}
        if "investment_entity_id" in cols:
            fks = {fk["referred_table"] for fk in inspector.get_foreign_keys("investments")}
            indexes = {idx["name"] for idx in inspector.get_indexes("investments")}
            # Use raw dialect-aware DDL via exec_driver_sql (SQLite-safe subset)
            try:
                connection.exec_driver_sql(
                    "ALTER TABLE investments ALTER COLUMN investment_entity_id SET NOT NULL"
                )
            except Exception:
                pass  # SQLite doesn't support this; schema is already correct there
            if "investment_entities" not in fks:
                try:
                    connection.exec_driver_sql(
                        "ALTER TABLE investments ADD CONSTRAINT investments_investment_entity_id_fkey "
                        "FOREIGN KEY (investment_entity_id) REFERENCES investment_entities(id) ON DELETE CASCADE"
                    )
                except Exception:
                    pass  # SQLite doesn't support ADD CONSTRAINT
            if "ix_investments_investment_entity_id" not in indexes:
                try:
                    connection.exec_driver_sql(
                        "CREATE INDEX ix_investments_investment_entity_id ON investments(investment_entity_id)"
                    )
                except Exception:
                    pass


def _apply_migrations() -> None:
    """Apply Alembic migrations on startup.

    Strategy:
    - Fresh DB (no tables): run ``alembic upgrade head`` to create the schema via migrations.
    - Existing DB managed by Alembic (``alembic_version`` table present): run pending migrations.
    - Legacy DB (tables exist but no ``alembic_version``): create missing tables via
      ``create_all`` then stamp head so future runs use Alembic normally.
    """
    from alembic import command  # noqa: PLC0415 (deferred import to avoid heavy cost in tests)
    from alembic.config import Config

    _BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    alembic_cfg = Config(os.path.join(_BACKEND_DIR, "alembic.ini"))

    # Share the application engine with Alembic so SQLite in-memory DBs work
    # consistently in tests (otherwise Alembic would build its own engine
    # against a different ephemeral memory DB and the tables would vanish).
    with engine.connect() as connection:
        alembic_cfg.attributes["connection"] = connection
        inspector = inspect(connection)
        table_names = inspector.get_table_names()

        if not table_names or "alembic_version" in table_names:
            # Fresh DB or already managed by Alembic — run migrations normally.
            command.upgrade(alembic_cfg, "head")
        else:
            # Legacy DB: ensure all tables exist, then stamp so future runs are migration-based.
            Base.metadata.create_all(bind=connection)
            command.stamp(alembic_cfg, "head")
        connection.commit()


def init_db() -> None:
    """Apply schema migrations and execute idempotent compatibility migrations."""
    _apply_migrations()
    _migrate_categories_to_global()
    _migrate_investments_to_entities()
