# Security Policy

## Reportar vulnerabilidades

Si encontrás una vulnerabilidad de seguridad, **no abras un issue público con detalles sensibles**.

Reportá de forma privada por uno de estos canales:

- **GitHub Security Advisory** (recomendado): <https://github.com/AlbionDraig/AtlasFinance/security/advisories/new>
- Contacto privado del owner del repositorio.

Esperá una respuesta inicial dentro de los próximos días hábiles. Te pediremos pasos de reproducción y la versión/commit afectados.

## Versiones soportadas

Solo `main` recibe parches de seguridad mientras el proyecto esté en fase pre-1.0.

## Alcance

Este proyecto incluye:

- API backend (FastAPI + SQLAlchemy + PostgreSQL).
- ETL de archivos CSV/XLSX (parsers bancarios).
- Frontend SPA (React 19 + Vite + TypeScript).
- Configuración Docker / docker-compose.
- Pipeline GitHub Actions (CI, security scans, CodeQL).

## Buenas prácticas activas

- **Autenticación JWT** con `access_token` + `refresh_token` y blacklist en `revoked_tokens`.
- **Hashing bcrypt** vía `passlib`.
- **Rate limiting** (`slowapi`) en endpoints de auth.
- **CORS** configurable por variable de entorno.
- **Variables de entorno** para configuración sensible; `.env` excluido del control de versiones.
- **Bandit** (SAST) + **pip-audit** (CVEs en dependencias) en CI.
- **CodeQL** scheduled scans para Python y TypeScript/JavaScript.
- **Pre-commit hooks** con ruff y bandit.

## Recomendaciones de hardening para producción

- Rotar `SECRET_KEY` periódicamente.
- Usar HTTPS en todos los entornos expuestos.
- Limitar CORS a dominios confiables explícitos.
- Habilitar logging estructurado (`structlog`) y auditoría de accesos.
- Rate-limit más estricto en producción y WAF/CDN delante.
- Escaneo automático de dependencias y SBOM en cada release.
- Aplicar `alembic upgrade head` como paso explícito del pipeline de deploy (no confiar en el auto-migrate del startup).
- Backups y rotación de credenciales de PostgreSQL.

## Disclosure

Una vez confirmada y corregida la vulnerabilidad, publicaremos un **GitHub Security Advisory** con los detalles, los commits que la corrigen y el crédito al reporter (si así lo desea).
