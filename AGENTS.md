# AtlasFinance — Agent Steering

This file provides top-level instructions for any AI coding agent working in this repository.
Detailed layer-specific rules live in `.github/instructions/`.

## Project structure

| Folder | Purpose |
|---|---|
| `backend/` | Python / FastAPI REST API + SQLAlchemy + Alembic |
| `frontend/` | React + Vite + TypeScript + Tailwind CSS |
| `docker/` | Dockerfiles for backend and frontend |
| `data/` | Static seed data and fixtures |
| `.github/` | CI workflows, agent customization, hooks, and instructions |

## Core principles (apply everywhere)

- **DRY** — no duplicated logic; extract shared utilities.
- **Clean Architecture** — separate Presentation / Application / Domain / Infrastructure layers.
- **SOLID** — single responsibility, explicit dependencies, dependency inversion.
- **KISS / YAGNI** — solve with minimum necessary complexity.
- **Security-first** — validate inputs, no hardcoded secrets, least privilege.

## Language conventions

- Docstrings (functions, classes, modules): **English**.
- Inline comments (business logic, design decisions): **Spanish or English** — consistent within a file.
- Never mix languages within the same docstring or comment block.

## Layer rules (summary)

### Backend
- Routers → call services, return response schemas. No business logic.
- Services → all business logic; injected via `Depends()`.
- Repositories → all DB access; receive `AsyncSession`.
- Schemas → Pydantic v2 contracts; never expose ORM models directly.

### Frontend
- Pages → layout + composition; delegate fetching to hooks.
- Components → presentational only; no API calls or business logic.
- Hooks → React Query (`useQuery` / `useMutation`); typed params and responses.
- Design system → use only tokens from `tailwind.config.js`; no default Tailwind color scales.

## What agents must NOT do

- Expose secrets, tokens, or credentials in code, logs, or responses.
- Mix business logic with controllers, routers, or UI components.
- Apply destructive git or filesystem commands without explicit user confirmation.
- Make changes unrelated to the current task.
- Use `any` / untyped `dict` where explicit types are required.

## Available agents

Use the most specific agent for the task. Prefer specialized agents over the generic Implementer.

| Agent | File | When to use |
|---|---|---|
| **Backend Implementer** | `.github/agents/backend-implementer.agent.md` | FastAPI routers, services, repositories, schemas, models, migrations, backend tests. |
| **Frontend Implementer** | `.github/agents/frontend-implementer.agent.md` | React pages, components, hooks, styles, frontend tests. |
| **Implementer** | `.github/agents/implementer.agent.md` | Cross-cutting or full-stack changes that touch both backend and frontend simultaneously. |
| **Reviewer** | `.github/agents/reviewer.agent.md` | Code review, architecture audit, security analysis, quality assessment. |
| **Explore** | `.github/agents/explore.agent.md` | Read-only codebase exploration; safe to invoke in parallel. |

> **Rule:** If the task is scoped to a single layer, use Backend Implementer or Frontend Implementer.
> Only escalate to the generic Implementer when a single change necessarily spans both stacks.

## Validation before closing a task

**Backend scope:**
1. `ruff check backend/app backend/tests`
2. `pylint backend/app --fail-under=8.0`
3. `bandit -q -r backend/app -ll`
4. `pytest backend/tests --cov=backend/app --cov-fail-under=85`

**Frontend scope:**
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test:coverage`
4. `npm run build`

**Always:** state what changed, why, and any residual risks or open TODOs.

## Detailed instructions

| Scope | File |
|---|---|
| All files (principles) | `.github/instructions/engineering-principles.instructions.md` |
| Backend Python | `.github/instructions/backend.instructions.md` |
| Frontend TypeScript/React | `.github/instructions/frontend.instructions.md` |
| Tests | `.github/instructions/testing.instructions.md` |
| DB / Migrations | `.github/instructions/database.instructions.md` |
| Security (OWASP, auth, headers, secrets) | `.github/instructions/security.instructions.md` |
| Config files / CI | `.github/instructions/project-config.instructions.md` |
| Git & commits | `.github/instructions/git.instructions.md` |
