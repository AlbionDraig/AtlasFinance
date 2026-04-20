# Security Policy

## Reportar vulnerabilidades

Si encuentras una vulnerabilidad de seguridad, no abras un issue publico con detalles sensibles.

Por favor reporta de forma privada al mantenedor del repositorio:

- Repositorio: https://github.com/AlbionDraig/AtlasFinance
- Canal recomendado: Security Advisory de GitHub o contacto privado del owner

## Alcance

Este proyecto incluye:

- API backend (FastAPI)
- ETL de archivos CSV/XLSX
- Dashboard local (Streamlit)
- Configuracion Docker/CI

## Buenas practicas actuales

- Autenticacion JWT
- Hash de contrasenas
- Variables de entorno para configuracion sensible
- Exclusion de `.env` del control de versiones

## Recomendaciones de hardening para produccion

- Rotar `SECRET_KEY` periodicamente
- Usar HTTPS en todos los entornos expuestos
- Limitar CORS por dominio confiable
- Agregar rate limiting y auditoria de acceso
- Escaneo de dependencias en CI
