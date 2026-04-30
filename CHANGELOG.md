# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Per-file coverage thresholds** in `frontend/vitest.config.ts` for `ProtectedRoute.tsx` and `ErrorBoundary.tsx` (95% lines/functions/statements). Joins the existing thresholds for `lib/utils.ts` and `lib/passwordStrength.ts`.
- **`authStore` unit tests** (`src/store/authStore.test.ts`) covering `setUser`/`logout`/initial state — bumps the file from 50% → 100% line coverage.
- **i18n in error boundaries**: `ErrorBoundary` and `PageErrorBoundary` now read their copy from `errors.*` keys in `i18n/locales/{es,en}.json` instead of having hardcoded Spanish strings. `PageErrorBoundary` accepts a `labelKey` prop (e.g. `errors.page_label_dashboard`).
- **i18next bootstrapped in test setup** (`src/test/setup.ts`) so components using `useTranslation()` render real translations during Vitest runs.
- **Pre-commit manual hooks** for the frontend: `tsc-frontend` (`npm run type-check`) and `eslint-frontend` (`npm run lint`). Run them with `pre-commit run --hook-stage manual <id>`.
- **PageSkeleton** component (`components/ui/PageSkeleton.tsx`) used by Accounts, Transactions, Categories, Pockets and Investments pages. Replaces the centred `LoadingSpinner` with a layout-stable skeleton (header + cards + table) so content no longer "jumps" when data arrives.
- **URL-persisted filters** in the Transactions page: `q`, `type`, `currency`, `account`, `period`, `from`, `to`, `pageSize` are reflected in the URL via `useSearchParams`, so links and reloads keep the active filter state.
- **Additional Playwright E2E specs** (`frontend/e2e/additional-flows.spec.ts`) covering Pockets, Investments and Accounts smoke renders, Transactions URL filter persistence, and a no-error-boundary navigation walk through all private routes.
- **Per-page error boundary** (`PageErrorBoundary`) with `Reintentar` button that invalidates the relevant React Query keys before re-rendering the subtree. Wired into all private routes in `App.tsx`.
- **Integration tests** for `/transactions/transfer`, `/pockets/move-funds` and `/transactions/export` (`tests/integration/test_transfers_and_export.py`, +12 tests, total 133 backend tests).
- **Cache invalidation** in mutations across Banks, Countries, Investment Entities, Investments, Pockets and Transactions pages — keeps catalog data and balances in sync across views.
- **Strict TypeScript** (`strict: true`) enabled in `tsconfig.app.json`; CI already runs `npm run type-check` so the gate is enforced on every PR.
- **Alembic migrations** wired into FastAPI startup (`_apply_migrations()` in `db/init_db.py`) with three strategies: fresh DB, alembic-managed DB, and legacy DB stamping.
- **React Query DevTools** mounted in dev only (`buttonPosition="bottom-left"`).
- **`EmptyState` component** in `frontend/src/components/ui/` with icon + title + description, used in Investments and Pockets.
- **Cache invalidation after mutations** in Categories and Accounts pages via `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.<x> })`.
- **CSV export** for transactions: backend endpoint `GET /api/v1/transactions/export` + UI button respecting active filters.
- **Server-side pagination** for transactions (`skip`, `limit`).
- **Skeleton loaders** (`SkeletonCard`) on dashboard and lists while React Query fetches.
- **Global Error Boundary** in `App.tsx` with i18n fallback UI.
- **Playwright E2E** test suite (`frontend/e2e/`) covering login, navigation and transaction creation.
- **Vitest coverage thresholds** per file in `vitest.config.ts` (`lib/utils.ts` 90%, `passwordStrength.ts` 90%).
- **CI coverage gate** for backend (≥ 85%) and frontend with Codecov upload.

### Changed

- **Frontend stack migrated** from Streamlit to React 19 + TypeScript + Vite. Legacy code preserved under `frontend_old/`.
- **Catalog data layer** unified through React Query (`useCatalogQueries`) replacing ad-hoc `useEffect` fetches.
- **Auth flow** uses access + refresh tokens with revoked-token blacklist.
- **Documentation overhaul**: README, CONTRIBUTING, frontend/README rewritten to reflect current architecture (React + Vite, Alembic, Playwright, server-side pagination).

### Fixed

- Stale `node_modules` after dependency changes in Docker (documented Docker volume rebuild workflow).
- Form state cleanup after save (achieved through conditional modal mounting `{showCreate && <Modal>}`).

---

## [0.1.0] - Initial baseline

### Added

- Base architecture (FastAPI + SQLAlchemy 2.0 + PostgreSQL).
- JWT authentication and bcrypt password hashing.
- Domain models: User, Bank, Account, Pocket, Transaction, Category, Investment, InvestmentEntity, Country, RevokedToken.
- ETL pipeline for CSV/Excel bank statements (Bancolombia, Nequi).
- Streamlit dashboard (deprecated, see `frontend_old/`).
- Docker Compose stack: PostgreSQL + backend + frontend.
- CI workflow with Ruff lint, pytest, coverage gate (≥ 85%) and Codecov upload.
- Project governance docs: CONTRIBUTING, SECURITY, LICENSE.
- API endpoints CRUD for banks, accounts, pockets, categories, countries, investments, investment entities, transactions.
- Metrics endpoints: `/metrics/dashboard`, `/metrics/aggregates`.
- Pocket transfer endpoint `/pockets/move-funds` and account transfer `/transactions/transfer`.
- Integration tests for full API flow.
