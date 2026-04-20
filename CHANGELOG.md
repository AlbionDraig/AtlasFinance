# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog and semantic versioning.

## [Unreleased]

### Added

- Base architecture for Atlas Finance (FastAPI, SQLAlchemy, ETL, Streamlit)
- JWT auth and password hashing
- Docker setup for backend + PostgreSQL
- CI workflow with lint, tests, and coverage gate
- Coverage upload to Codecov
- Project governance docs: CONTRIBUTING, SECURITY, LICENSE

### Changed

- Dashboard authentication flow now supports in-app login and JWT session handling

### Fixed

- Streamlit startup fallback when `secrets.toml` is missing
- Compatibility adjustments for local Python 3.14 environment
