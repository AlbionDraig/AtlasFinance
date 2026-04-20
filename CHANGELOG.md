# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog and semantic versioning.

## [Unreleased]

### Added

- Base architecture for Atlas Finance (FastAPI, SQLAlchemy, ETL, Streamlit)
- JWT auth and password hashing
- Docker setup for backend + PostgreSQL
- Docker setup for dashboard (frontend) integrated in `docker-compose.yml`
- CI workflow with lint, tests, and coverage gate
- Coverage upload to Codecov
- Project governance docs: CONTRIBUTING, SECURITY, LICENSE
- API list endpoints for banks, accounts, and categories
- API update/delete endpoints for transactions
- Integration tests for list/update/delete transaction API flow

### Changed

- Dashboard authentication flow now supports in-app login/registration and JWT session handling
- Dashboard UX now follows auth-first flow (login first, dashboard after authentication)
- Dashboard movement module now supports create/edit/delete operations from UI
- Documentation updated to reflect dockerized dashboard and current API flow

### Fixed

- Streamlit startup fallback when `secrets.toml` is missing
- Compatibility adjustments for local Python 3.14 environment
- Coverage gate restored above target after endpoint expansion (91.25%)
