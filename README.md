# Atlas Finance

[![CI](https://github.com/AlbionDraig/AtlasFinance/actions/workflows/ci.yml/badge.svg)](https://github.com/AlbionDraig/AtlasFinance/actions/workflows/ci.yml)
[![Frontend CI](https://github.com/AlbionDraig/AtlasFinance/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/AlbionDraig/AtlasFinance/actions/workflows/frontend-ci.yml)
[![Security](https://github.com/AlbionDraig/AtlasFinance/actions/workflows/security.yml/badge.svg)](https://github.com/AlbionDraig/AtlasFinance/actions/workflows/security.yml)
[![Code Quality](https://github.com/AlbionDraig/AtlasFinance/actions/workflows/code-quality.yml/badge.svg)](https://github.com/AlbionDraig/AtlasFinance/actions/workflows/code-quality.yml)
[![Coverage](https://codecov.io/gh/AlbionDraig/AtlasFinance/graph/badge.svg?branch=main)](https://codecov.io/gh/AlbionDraig/AtlasFinance)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Atlas Finance es una plataforma de gestión financiera personal con arquitectura modular para escalar a SaaS. La fase actual está pensada para uso individual (single-user / per-account), con base de datos relacional y un frontend SPA dedicado.

Repositorio: <https://github.com/AlbionDraig/AtlasFinance>

---

## Tabla de contenido

1. [Stack](#1-stack)
2. [Arquitectura](#2-arquitectura)
3. [Estructura del repositorio](#3-estructura-del-repositorio)
4. [Modelo de dominio](#4-modelo-de-dominio)
5. [Puesta en marcha (Docker)](#5-puesta-en-marcha-docker)
6. [Desarrollo local sin Docker](#6-desarrollo-local-sin-docker)
7. [API REST](#7-api-rest)
8. [Frontend](#8-frontend)
9. [Migraciones (Alembic)](#9-migraciones-alembic)
10. [Tests y calidad](#10-tests-y-calidad)
11. [CI/CD](#11-cicd)
12. [Seguridad](#12-seguridad)
13. [Roadmap](#13-roadmap)
14. [Licencia](#14-licencia)

---

## 1. Stack

### Backend

- **FastAPI 0.136** + **Starlette 0.49** — framework HTTP async.
- **SQLAlchemy 2.0** ORM con `DeclarativeBase` y tipado `Mapped[...]`.
- **PostgreSQL 16** en producción / Docker; **SQLite en memoria** en CI.
- **Pydantic v2** + **pydantic-settings** para schemas y configuración.
- **Alembic 1.13** para migraciones versionadas.
- **python-jose** + **passlib (bcrypt)** para JWT y hashing de password.
- **slowapi** para rate-limiting; **structlog** para logs estructurados.
- **pandas + openpyxl** para ETL de archivos bancarios CSV/Excel.

### Frontend

- **React 19** + **TypeScript 5** + **Vite 8** (HMR, ESM nativo).
- **Tailwind CSS** con tokens semánticos (`bg-brand`, `text-success`, …) — ver [`.github/copilot-instructions.md`](.github/copilot-instructions.md).
- **TanStack React Query 5** para caché de catálogos y server state.
- **Zustand** para estado de autenticación local.
- **i18next** (es / en) con detección por navegador.
- **Recharts** para gráficos del dashboard.
- **Axios** con interceptor JWT + refresh.
- **Vitest** (unit + cobertura V8) y **Playwright** (E2E).

### Infraestructura

- **Docker Compose** orquesta `db`, `backend` y `frontend` con healthchecks.
- **GitHub Actions**: CI backend, CI frontend, CodeQL, security scan, code-quality.
- **pre-commit** con ruff + bandit + checks genéricos.

---

## 2. Arquitectura

```text
┌──────────────────────────┐         ┌────────────────────────────────────┐
│  React SPA (Vite + TS)   │  HTTPS  │           FastAPI (Python)         │
│                          │ ──────▶ │  ┌──────────────────────────────┐  │
│  pages → hooks → api/    │  JWT    │  │  api/v1/routes/*  (router)   │  │
│  React Query cache       │ ◀────── │  └──────────────────────────────┘  │
│  Zustand auth store      │         │  ┌──────────────────────────────┐  │
└──────────────────────────┘         │  │  services/*  (business)      │  │
                                     │  └──────────────────────────────┘  │
                                     │  ┌──────────────────────────────┐  │
                                     │  │  models/*  (SQLAlchemy ORM)  │  │
                                     │  └──────────────────────────────┘  │
                                     └─────────────┬──────────────────────┘
                                                   │ SQLAlchemy 2.0
                                                   ▼
                                     ┌────────────────────────────────────┐
                                     │   PostgreSQL 16 (Docker volume)    │
                                     └────────────────────────────────────┘
```

### Capas backend (`backend/app/`)

| Capa | Responsabilidad |
|------|-----------------|
| `api/v1/routes/` | Endpoints REST, validación Pydantic, dependencias de auth/DB. |
| `api/deps.py` | `get_db`, `get_current_user`, helpers de autorización. |
| `api/error_handlers.py` | Mapeo centralizado de excepciones a respuestas HTTP. |
| `core/config.py` | `Settings` (pydantic-settings) cacheado con `lru_cache`. |
| `core/security.py` | Hashing de password, encode/decode JWT, refresh tokens. |
| `db/base.py` | `Base = DeclarativeBase`, engine, `SessionLocal`, `get_db`. |
| `db/init_db.py` | Aplica Alembic en startup + migraciones idempotentes legacy. |
| `db/seed.py` | Datos demo opcionales (`SEED_DEMO_DATA=true`). |
| `models/` | Entidades ORM (User, Account, Pocket, Transaction, …). |
| `schemas/` | Modelos Pydantic de request/response. |
| `services/` | Lógica de negocio: `auth_service`, `finance_service`, `currency_service`. |
| `etl/` | Parsers de extractos bancarios y normalización. |

### Capas frontend (`frontend/src/`)

| Capa | Responsabilidad |
|------|-----------------|
| `pages/` | Páginas top-level montadas por React Router. |
| `pages/<page>/components/` | Componentes locales solo usados por esa página. |
| `components/ui/` | Primitivas reutilizables (Modal, Toast, EmptyState, SkeletonCard…). |
| `layouts/AppLayout.tsx` | Sidebar + outlet para rutas autenticadas. |
| `hooks/` | Lógica reutilizable: `useToast`, `useAccountsData`, `useCatalogQueries`. |
| `api/` | Clientes axios tipados por recurso (`accountsApi`, `transactionsApi`, …). |
| `lib/` | Utilities (`formatCurrency`, `getApiErrorMessage`, password strength). |
| `store/authStore.ts` | Zustand store: usuario actual, tokens, persistencia. |
| `i18n/locales/` | `es.json` y `en.json` con todas las traducciones. |
| `types/` | Tipos compartidos (`Account`, `Transaction`, `Investment`, …). |

### Flujo de una request

1. Componente React llama a `transactionsApi.list(filters)` (axios).
2. Interceptor adjunta `Authorization: Bearer <jwt>` desde el store.
3. FastAPI resuelve `Depends(get_current_user)` decodificando el JWT.
4. Endpoint en `routes/transactions.py` valida con Pydantic y llama al `finance_service`.
5. Service interactúa con SQLAlchemy y devuelve modelos.
6. La respuesta se serializa con `response_model` Pydantic y vuelve al cliente.
7. React Query cachea según `queryKey`; mutaciones invalidan caches relacionados.

---

## 3. Estructura del repositorio

```text
AtlasFinance/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py                  # Dependencias FastAPI (auth, DB)
│   │   │   ├── error_handlers.py        # Mapeo de excepciones
│   │   │   └── v1/
│   │   │       ├── router.py            # Agrega todas las routes /api/v1/*
│   │   │       └── routes/
│   │   │           ├── accounts.py
│   │   │           ├── auth.py          # /register /login /refresh /logout /me
│   │   │           ├── banks.py
│   │   │           ├── categories.py
│   │   │           ├── countries.py
│   │   │           ├── investments.py
│   │   │           ├── investment_entities.py
│   │   │           ├── metrics.py       # /dashboard /aggregates
│   │   │           ├── pockets.py       # incluye /move-funds
│   │   │           └── transactions.py  # incluye /transfer y /export (CSV)
│   │   ├── core/                        # config + security
│   │   ├── db/                          # base + init_db + seed
│   │   ├── etl/                         # parsers bancarios
│   │   ├── models/                      # SQLAlchemy
│   │   ├── schemas/                     # Pydantic
│   │   ├── services/                    # Lógica de negocio
│   │   └── main.py                      # FastAPI app + lifespan
│   ├── alembic/
│   │   ├── env.py                       # Lee URL desde Settings
│   │   ├── versions/                    # Revisiones versionadas
│   │   └── README.md
│   ├── tests/
│   │   ├── conftest.py                  # Fixtures (DB en memoria)
│   │   ├── unit/
│   │   └── integration/
│   ├── alembic.ini
│   ├── pyproject.toml                   # Config ruff + mypy
│   ├── pytest.ini
│   ├── requirements.txt
│   └── seed_demo.py                     # Script standalone de seed
├── frontend/
│   ├── src/
│   │   ├── api/                         # Clientes axios por recurso
│   │   ├── components/ui/               # Primitivas reutilizables
│   │   ├── hooks/                       # useToast, useCatalogQueries, …
│   │   ├── i18n/                        # i18next + locales
│   │   ├── layouts/AppLayout.tsx
│   │   ├── lib/                         # axios.ts, utils.ts
│   │   ├── pages/                       # AccountsPage, DashboardPage, …
│   │   ├── store/                       # Zustand auth store
│   │   ├── App.tsx                      # Router top-level
│   │   └── main.tsx                     # Bootstrap + RQ provider
│   ├── e2e/                             # Tests Playwright
│   ├── playwright.config.ts
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── vitest.config.ts
├── docker/
│   ├── Dockerfile.backend               # python:3.12-slim + uvicorn
│   └── Dockerfile.frontend              # node:22-alpine + vite dev
├── docker-compose.yml                   # db + backend + frontend
├── .github/
│   ├── workflows/                       # ci.yml, frontend-ci.yml, security.yml, …
│   ├── copilot-instructions.md          # Tokens de diseño + reglas UI
│   └── prompts/                         # Plantillas Copilot por tipo de cambio
├── data/                                # Archivos de ejemplo ETL
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

---

## 4. Modelo de dominio

```text
                                ┌──────┐
                                │ User │
                                └──┬───┘
                                   │ 1
              ┌────────────────────┼────────────────────┐
              │ N                  │ N                  │ N
              ▼                    ▼                    ▼
         ┌────────┐          ┌──────────┐         ┌──────────────────┐
         │  Bank  │          │ Category │         │ InvestmentEntity │
         └───┬────┘          └────┬─────┘         └─────────┬────────┘
             │ 1                  │                         │ 1
             │ N                  │                         │ N
             ▼                    │                         ▼
        ┌─────────┐               │                    ┌────────────┐
        │ Account │               │                    │ Investment │
        └────┬────┘               │                    └────────────┘
        1│        │N
         │        │
         ▼        ▼
   ┌────────┐  ┌──────────────┐
   │ Pocket │  │ Transaction  │── Category (N:1)
   └────────┘  └──────────────┘
```

### Entidades principales

- **User**: cuenta del propietario (email único, password hash).
- **Bank**: institución bancaria del usuario.
- **Account**: cuenta bancaria (`savings | checking`, moneda `COP | USD`).
- **Pocket**: bolsillo / sub-balance dentro de una cuenta (misma moneda, nombre único por cuenta).
- **Transaction**: movimiento (`income | expense | transfer`), opcionalmente categorizado.
- **Category**: catálogo global (no por usuario) con flag `is_fixed` y `category_type`.
- **Investment** + **InvestmentEntity**: instrumentos financieros y emisores (banco, fondo, broker).
- **Country**: catálogo ISO usado por bancos / entidades.
- **RevokedToken**: blacklist de JWT (logout server-side).

Monedas soportadas en fase inicial: **COP, USD**.

---

## 5. Puesta en marcha (Docker)

Requisitos: **Docker Desktop** (Windows/Mac) o **docker + docker-compose** (Linux).

```bash
git clone https://github.com/AlbionDraig/AtlasFinance.git
cd AtlasFinance

# Variables de entorno del backend
cp backend/example.env backend/.env       # Linux/Mac
copy backend\example.env backend\.env     # Windows

docker compose up -d --build
```

Servicios:

| Servicio | Container | URL local |
|----------|-----------|-----------|
| PostgreSQL 16 | `atlas-db` | `localhost:5432` |
| FastAPI | `atlas-backend` | <http://localhost:8000> · docs en `/docs` |
| React + Vite | `atlas-frontend` | <http://localhost:8502> |

Verificación rápida:

```bash
curl http://localhost:8000/health
# → {"status":"ok"}
```

### Datos demo

Para arrancar con datos pre-cargados (usuario, banco, cuentas, transacciones):

```bash
# En backend/.env
SEED_DEMO_DATA=true
ENVIRONMENT=development
```

O ejecuta una vez:

```bash
docker exec atlas-backend python seed_demo.py
```

Credenciales demo: `jane.doe@sgb.co` / `Demo1234!`

### Reconstruir tras cambios de dependencias

Si modificás `package.json` o `requirements.txt`, hay que reconstruir la imagen:

```bash
docker compose build frontend          # o backend
docker compose down frontend
docker volume ls --filter dangling=true -q | ForEach-Object { docker volume rm $_ }
docker compose up -d frontend
```

> El volumen anónimo `/app/frontend/node_modules` mantiene `node_modules` ligado a la imagen original; al cambiar dependencias hay que recrearlo.

---

## 6. Desarrollo local sin Docker

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1            # Windows
# source .venv/bin/activate             # Linux/Mac

pip install -r requirements.txt

# Variables mínimas
$env:DATABASE_URL = "sqlite+pysqlite:///./atlas.db"
$env:SECRET_KEY = "dev-secret-change-me"

# Migraciones
python -m alembic upgrade head

# Servidor con hot-reload
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm ci
npm run dev          # Vite en http://localhost:5173
```

Variables de entorno frontend (`.env.local`):

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 7. API REST

Prefijo global: **`/api/v1`**. Documentación interactiva: <http://localhost:8000/docs> (Swagger UI) y `/redoc`.

### Auth

| Método | Path | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Crear usuario |
| POST | `/auth/login` | Devuelve `access_token` + `refresh_token` |
| POST | `/auth/refresh` | Renueva access usando refresh token |
| POST | `/auth/logout` | Revoca el JWT actual |
| GET | `/auth/me` | Perfil del usuario autenticado |
| PATCH | `/auth/me` | Actualiza datos del perfil |

### Recursos CRUD (todos requieren JWT)

`/banks`, `/accounts`, `/pockets`, `/categories`, `/countries`, `/investment-entities`, `/investments` siguen el patrón:

- `POST /` — crear
- `GET /` — listar (filtros vía query params)
- `GET /{id}` — detalle (donde aplica)
- `PUT /{id}` — actualizar
- `DELETE /{id}` — eliminar

### Endpoints especiales

| Método | Path | Descripción |
|--------|------|-------------|
| POST | `/pockets/move-funds` | Mover saldo entre bolsillos de la misma cuenta |
| POST | `/transactions/transfer` | Transferencia entre cuentas (genera dos movimientos enlazados) |
| GET | `/transactions/export` | Descarga CSV con los filtros activos |
| GET | `/metrics/dashboard?currency=COP` | KPIs principales del dashboard |
| GET | `/metrics/aggregates` | Agregados por categoría / período |

Paginación de transacciones: `?skip=&limit=` con `total` en headers o body según endpoint.

---

## 8. Frontend

### Páginas principales (`frontend/src/pages/`)

- **`/login`, `/register`** — autenticación (rutas públicas).
- **`/dashboard`** — KPIs + gráficos (Recharts) con SkeletonCards mientras carga.
- **`/transactions`** — historial con paginación server-side, filtros, exportación CSV.
- **`/accounts`** — CRUD de cuentas bancarias.
- **`/pockets`** — bolsillos agrupados por cuenta + transferencias.
- **`/investments`** — inversiones con cálculo de rendimiento.
- **`/categories`** — catálogo de categorías.
- **`/admin`** — bancos, países, entidades de inversión.
- **`/profile`** — datos personales y cambio de contraseña.
- **`/management`** — administración de la sesión actual.

### Decisiones clave

- **React Query** maneja todos los catálogos compartidos (`accounts`, `banks`, `categories`, `countries`, `investmentEntities`) vía `useCatalogQueries`. Las páginas que mutan llaman `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.<x> })` después de un POST/PUT/DELETE para mantener la caché coherente sin recargar.
- **Tokens de diseño**: nunca usar colores arbitrarios de Tailwind (`red-500`, `green-600`). Las clases válidas están en `tailwind.config.js` (brand, success, warning, neutral). Reglas detalladas: [`.github/copilot-instructions.md`](.github/copilot-instructions.md).
- **Error Boundary global** en `App.tsx` con fallback UI en español/inglés.
- **i18n**: el idioma se persiste en `localStorage`; los toasts y mensajes usan `t('key')`.

### Scripts

```bash
npm run dev              # Vite dev server
npm run build            # Type-check + build prod
npm run lint             # ESLint
npm run test             # Vitest (unit)
npm run test:coverage    # Vitest + reporte LCOV
npm run test:e2e         # Playwright (necesita backend levantado)
npm run preview          # Sirve el build prod
```

---

## 9. Migraciones (Alembic)

Las migraciones viven en `backend/alembic/versions/`. La integración con el ciclo de arranque es transparente:

- **DB nueva (sin tablas)**: `alembic upgrade head` crea el esquema.
- **DB ya gestionada por Alembic**: aplica las pendientes hasta `head`.
- **DB legacy (sin `alembic_version`)**: ejecuta `Base.metadata.create_all` y luego `alembic stamp head` para que futuros runs sean migration-based.

Esta lógica está en `backend/app/db/init_db.py::_apply_migrations()` y se invoca durante el `lifespan` de FastAPI.

### Comandos habituales (desde `backend/`)

```bash
python -m alembic current                           # Versión actual
python -m alembic upgrade head                      # Aplicar pendientes
python -m alembic downgrade -1                      # Volver una atrás
python -m alembic revision --autogenerate -m "add x column"
```

Detalles adicionales: [`backend/alembic/README.md`](backend/alembic/README.md).

---

## 10. Tests y calidad

### Backend — pytest

```bash
cd backend
python -m pytest                                                    # Todos
python -m pytest tests/unit                                         # Unit
python -m pytest tests/integration                                  # Integration
python -m pytest --cov=app --cov-report=term-missing --cov-fail-under=85
```

Cobertura objetivo: **≥ 85%**. Test fixtures usan SQLite en memoria (ver `tests/conftest.py`).

### Frontend — Vitest

```bash
cd frontend
npm run test                  # watch + UI
npm run test:coverage         # CI mode + LCOV
```

Umbrales por archivo definidos en `vitest.config.ts` (`src/lib/utils.ts` 90%, `passwordStrength.ts` 90%).

### Frontend — Playwright (E2E)

```bash
npm run test:e2e
```

Cubre: login, navegación dashboard, creación de transacción, logout. La config arranca `npm run dev` automáticamente; en CI se usa `E2E_BASE_URL`.

### Linting y análisis estático

| Herramienta | Alcance |
|-------------|---------|
| **Ruff** | `backend/app`, `backend/tests` (lint + format) |
| **Pylint** | `backend/app` (`--fail-under=8.0`) |
| **Bandit** | `backend/app` (security) |
| **pip-audit** | `requirements.txt` (CVEs) |
| **Mypy** | `backend/app` (gradual typing) |
| **ESLint** | `frontend/src` |
| **TypeScript** | `tsc --noEmit` en build |

### Pre-commit

```bash
python -m pip install -r backend/requirements.txt
python -m pre_commit install

python -m pre_commit run --all-files
python -m pre_commit run --hook-stage manual pylint-backend
python -m pre_commit run --hook-stage manual pytest-backend
```

---

## 11. CI/CD

| Workflow | Disparadores | Qué hace |
|----------|--------------|----------|
| `ci.yml` | push a `main` + PRs a `main` | Ruff + pytest (gate de cobertura backend) + Codecov + smoke build + smoke de Alembic |
| `frontend-ci.yml` | push a `main` y PRs a `main` con cambios en `frontend/**` | `lint-and-build-frontend`: ESLint + type-check + unit tests + coverage + build; `e2e`: solo en push |
| `security.yml` | push a `main` + PRs a `main` | `security-scan`: Bandit + pip-audit; `frontend-security`: solo en push |
| `code-quality.yml` | push a `main` | `code-smell-scan`: Pylint + Mypy + smoke test de hooks; `frontend-quality`: solo en push |
| `codeql.yml` | push a `main` + PRs a `main` + cron semanal | CodeQL JS/TS + Python |

Variables inyectadas en CI:

- `DATABASE_URL=sqlite+pysqlite:///:memory:`
- `SECRET_KEY=ci-secret-key`
- `ENVIRONMENT=test`

### Replicar CI localmente

```bash
python -m pip install -r backend/requirements.txt
python -m ruff check backend/app backend/tests
python -m pylint backend/app --disable=missing-module-docstring,missing-class-docstring,missing-function-docstring,too-few-public-methods --fail-under=8.0
python -m bandit -q -r backend/app -ll
python -m pip_audit -r backend/requirements.txt
python -m pytest backend/tests --cov=backend/app --cov-report=term-missing --cov-fail-under=85
python -m compileall backend/app
```

---

## 12. Seguridad

Buenas prácticas activas:

- JWT con `access_token` (corto) + `refresh_token` (largo) y blacklist en `revoked_tokens`.
- Hashing **bcrypt** vía passlib.
- CORS configurable (default restrictivo).
- Rate limiting (slowapi) en endpoints de auth.
- `SECRET_KEY` desde variable de entorno; nunca en git.
- Bandit + pip-audit + CodeQL en CI.

Detalles y proceso de reporte: [`SECURITY.md`](SECURITY.md).

---

## 13. Roadmap

- [ ] Multi-tenant para SaaS (organizaciones, roles).
- [ ] OAuth2 con providers externos (Google, Microsoft).
- [ ] Integración con APIs bancarias (Open Banking / Plaid / Belvo).
- [ ] Clasificación de transacciones con ML.
- [ ] Mobile (React Native) reusando `api/` y tipos.
- [ ] Despliegue automatizado (Docker registry + staging/prod).

---

## 14. Licencia

MIT — ver [`LICENSE`](LICENSE).

## Documentación adicional

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — flujo de PRs y checklist de calidad.
- [`SECURITY.md`](SECURITY.md) — reporte de vulnerabilidades.
- [`CHANGELOG.md`](CHANGELOG.md) — historial de cambios.
- [`backend/alembic/README.md`](backend/alembic/README.md) — guía de migraciones.
- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) — tokens de diseño UI.
- [`.github/prompts/`](.github/prompts/) — plantillas Copilot para nuevas features.
