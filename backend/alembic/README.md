# Alembic Migrations

Esta carpeta contiene las migraciones de esquema para Atlas Finance.

## Diferencia respecto a `init_db()`

`app.db.init_db.init_db()` ejecuta `Base.metadata.create_all(...)` durante el
arranque de FastAPI. Es útil para entornos de desarrollo y CI (donde se usa
SQLite efímero), pero **no** versiona cambios de esquema, no soporta
migraciones reversibles y no es seguro en producción.

Alembic resuelve eso: cada cambio de esquema genera una revisión versionada,
reproducible y rollbackeable.

## Configuración

- `env.py` importa `Base.metadata` desde `app.db.base` y carga los modelos
  desde `app.models` para que `--autogenerate` los reconozca.
- La URL se toma de `app.core.config.get_settings().database_url`
  (variable `DATABASE_URL`). El campo `sqlalchemy.url` de `alembic.ini` es
  un placeholder que `env.py` sobreescribe en runtime.

## Comandos habituales

Desde `backend/`:

```bash
# Aplicar todas las migraciones pendientes.
python -m alembic upgrade head

# Crear una nueva revisión a partir de cambios en los modelos.
python -m alembic revision --autogenerate -m "describe change"

# Ver el estado actual de la BD.
python -m alembic current

# Volver una revisión atrás.
python -m alembic downgrade -1
```

## Convivencia con `init_db()` durante la transición

Mientras se completa la migración a Alembic en todos los entornos:

- **Tests** (`pytest`): siguen usando `init_db()` con SQLite en memoria.
  No se ejecuta Alembic en tests por velocidad.
- **Local / docker compose**: ejecutar `alembic upgrade head` antes del
  primer arranque, o dejar que `init_db()` cree las tablas la primera vez.
- **Producción**: ejecutar `alembic upgrade head` en el pipeline de
  despliegue antes de levantar la app.

La revisión inicial (`a3f5cac7b3b6_initial_schema.py`) refleja el esquema
completo derivado de los modelos al momento de adoptar Alembic.
