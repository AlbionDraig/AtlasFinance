"""Configuración Alembic para Atlas Finance.

Conecta con la app real:

- Carga ``Base.metadata`` con todos los modelos para autogenerate.
- Toma la URL desde ``app.core.config.get_settings()`` ignorando la del .ini,
  de modo que un mismo binario funcione en local, CI y producción usando las
  mismas variables de entorno que la app.
"""

from importlib import import_module
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context
from app.core.config import get_settings
from app.db.base import Base

# Importar modelos para que el metadata conozca todas las tablas.
import_module("app.models")

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Sobrescribimos sqlalchemy.url con la del entorno aplicativo.
config.set_main_option("sqlalchemy.url", get_settings().database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Modo offline: emite SQL a stdout sin conectar a la BD."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Modo online: ejecuta las migraciones contra la BD configurada.

    Si la app ya nos pasó una conexión vía ``config.attributes['connection']``
    (caso de los tests con SQLite in-memory y del startup de FastAPI), la
    reutilizamos para no crear un engine paralelo. En CLI directo, abrimos
    una conexión propia.
    """
    existing_connection = config.attributes.get("connection")
    if existing_connection is not None:
        context.configure(
            connection=existing_connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()
        return

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
