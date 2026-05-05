# Contributing to Atlas Finance

¡Gracias por contribuir a Atlas Finance! Este documento describe el flujo, los estándares y el checklist obligatorio antes de abrir un Pull Request.

## Flujo recomendado

1. Crea una rama desde `main` (o `develop` si ya existe).
2. Realiza cambios pequeños y enfocados (un PR = un objetivo).
3. Ejecuta el **checklist completo** local antes de abrir PR.
4. Abre Pull Request con descripción clara: problema, enfoque, riesgos, evidencia.

## Convención de ramas

- `feature/<descripcion-corta>` — nueva funcionalidad.
- `fix/<descripcion-corta>` — bug fix.
- `chore/<descripcion-corta>` — refactor, deps, infra, docs.
- `docs/<descripcion-corta>` — solo documentación.

## Convención de commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/) en inglés:

```
feat(scope): add csv export to transactions
fix(auth): refresh token race on parallel requests
chore(deps): bump fastapi to 0.136.1
docs(readme): update architecture diagram
test(finance): cover transfer rollback path
```

---

## Checklist local antes del PR

### Backend

```bash
# Desde la raíz del repo
python -m pip install -r backend/requirements.txt
python -m ruff check backend/app backend/tests
python -m pylint backend/app --disable=missing-module-docstring,missing-class-docstring,missing-function-docstring,too-few-public-methods --fail-under=8.0
python -m bandit -q -r backend/app -ll
python -m pip_audit -r backend/requirements.txt
python -m pytest backend/tests --cov=backend/app --cov-report=term-missing --cov-fail-under=85
python -m compileall backend/app
```

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run test:coverage
npm run build
# E2E (requiere backend levantado en :8000)
npm run test:e2e
```

### Migraciones (si tocaste modelos SQLAlchemy)

```bash
cd backend
python -m alembic revision --autogenerate -m "describe change"
# Revisa el archivo generado en backend/alembic/versions/ antes de commitear
python -m alembic upgrade head
python -m alembic downgrade -1   # Verifica que el rollback funciona
python -m alembic upgrade head
```

### Docker

```bash
docker compose config -q
git status --short
```

> **Nota:** si modificaste `frontend/package.json` o `backend/requirements.txt`, reconstruí la imagen Docker correspondiente y eliminá los volúmenes anónimos antes de validar (ver README §5).

---

## Política de calidad (obligatoria)

- ❌ No se permite mergear si falla cualquier check de **lint, tests o cobertura**.
- ✅ Cobertura mínima backend: **85%**.
- ✅ Cobertura mínima frontend: la definida por archivo en `vitest.config.ts`.
- ✅ Ningún cambio de schema sin migración Alembic asociada.
- ✅ Frontend compila sin warnings de TypeScript (`tsc --noEmit`).
- ✅ Docker/Compose válido (`docker compose config -q`).

## Estilo de código

### Backend

- Python 3.12+, tipos `Mapped[...]` en modelos SQLAlchemy 2.0.
- Schemas Pydantic v2 separados por contexto (`...Create`, `...Update`, `...Read`).
- Lógica de negocio en `services/`, **nunca** en routes.
- Funciones puras y nombres descriptivos; no abreviaturas crípticas.

### Frontend

- React 19 funcional, hooks idiomáticos. Sin clases.
- TypeScript estricto (sin `any` salvo casos justificados).
- **Tokens de diseño obligatorios** (ver [`.github/copilot-instructions.md`](.github/copilot-instructions.md)). Prohibido usar `red-500`, `green-600`, etc.
- React Query para server state; Zustand solo para auth/UI local.
- i18n: cualquier string visible debe estar en `frontend/src/i18n/locales/{en,es}.json`.

## Pre-commit (recomendado)

```bash
python -m pre_commit install
python -m pre_commit run --all-files
```

Hooks pesados bajo demanda:

```bash
python -m pre_commit run --hook-stage manual pylint-backend
python -m pre_commit run --hook-stage manual pytest-backend
```

## Pull Requests

Incluí en la descripción del PR:

- **Problema** que resuelve.
- **Enfoque** elegido y alternativas descartadas (si aplica).
- **Riesgos** o impacto (migraciones, ruptura de API, perf).
- **Evidencia** de pruebas: salida de tests, screenshots de UI, curl de la API.
- **Checklist** marcado:
  - [ ] Lint OK (backend + frontend)
  - [ ] Tests + cobertura OK
  - [ ] Migración Alembic incluida (si aplica)
  - [ ] Strings nuevos en `i18n` (es + en)
  - [ ] CHANGELOG.md actualizado en `[Unreleased]`

## Reportar problemas

- Bugs no sensibles: GitHub Issues.
- Vulnerabilidades de seguridad: ver [`SECURITY.md`](SECURITY.md).
