# Atlas Finance

[![CI](https://github.com/AlbionDraig/AtlasFinance/actions/workflows/ci.yml/badge.svg)](https://github.com/AlbionDraig/AtlasFinance/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/AlbionDraig/AtlasFinance/graph/badge.svg?branch=main)](https://codecov.io/gh/AlbionDraig/AtlasFinance)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Atlas Finance es una plataforma de gestion financiera personal (fase inicial de un futuro SaaS). Esta version esta pensada para un unico usuario, con arquitectura modular para escalar.

Repositorio oficial: https://github.com/AlbionDraig/AtlasFinance

## 1. Que incluye este proyecto

- Backend API con FastAPI
- Base de datos PostgreSQL (via SQLAlchemy)
- ETL para carga manual por CSV/Excel (formatos bancarios)
- Clasificacion automatica basica de gastos
- Dashboard local en Streamlit
- Seguridad base con hash de password y JWT
- Docker para desarrollo y base de produccion
- Pruebas unitarias e integracion
- Pipeline de GitHub Actions para lint, tests y build check

## 2. Arquitectura por capas

El proyecto esta organizado para separar responsabilidades:

- API: rutas REST, autenticacion y validaciones de entrada
- Services: logica de negocio (creacion de bancos, cuentas, transacciones, metricas)
- Models: entidades SQLAlchemy y relaciones
- ETL: parseo de archivos, normalizacion por banco y clasificacion
- Dashboard: visualizacion en Streamlit consumiendo la API

## 3. Estructura del repositorio

```text
backend/
	app/
		api/
		core/
		db/
		etl/
		models/
		schemas/
		services/
		main.py
	tests/
	requirements.txt
	.env.example
dashboard/
docker/
data/samples/
.github/workflows/
```

## 4. Modelo financiero implementado

Entidades incluidas:

- Users
- Banks
- Accounts (relacionadas a Banks)
- Pockets (relacionadas a Accounts)
- Transactions
- Categories
- Investments

Monedas soportadas en fase inicial:

- COP
- USD

## 5. Requisitos previos

- Python 3.12+
- Docker Desktop (opcional, recomendado)
- Git

## 6. Configuracion local paso a paso (detallado)

### Paso 1: clonar y entrar al proyecto

```bash
git clone https://github.com/AlbionDraig/AtlasFinance.git
cd AtlasFinance
```

### Paso 2: configurar variables de entorno

```bash
copy backend\.env.example backend\.env
```

En Linux/Mac:

```bash
cp backend/.env.example backend/.env
```

### Paso 3: levantar infraestructura con Docker (recomendado)

```bash
docker compose up -d --build
```

Esto inicia:

- PostgreSQL en puerto 5432
- Backend FastAPI en puerto 8000
- Dashboard Streamlit en puerto 8502

### Paso 4: verificar API

Abre en navegador:

- http://localhost:8000/health
- http://localhost:8000/docs

## 7. Flujo funcional minimo para probar

### 7.1 Registrar usuario

Endpoint: `POST /api/v1/auth/register`

### 7.2 Login y obtener token

Endpoint: `POST /api/v1/auth/login`

### 7.3 Crear banco, cuenta y categoria

- `POST /api/v1/banks/`
- `GET /api/v1/banks/`
- `POST /api/v1/accounts/`
- `GET /api/v1/accounts/`
- `POST /api/v1/categories/`
- `GET /api/v1/categories/`

### 7.4 Registrar transaccion manual

Endpoint: `POST /api/v1/transactions/`

### 7.5 Editar o eliminar transaccion

- `PUT /api/v1/transactions/{transaction_id}`
- `DELETE /api/v1/transactions/{transaction_id}`

### 7.6 Consultar metricas

Endpoint: `GET /api/v1/metrics/dashboard?currency=COP`

## 8. Carga ETL por archivo (CSV/Excel)

Endpoint: `POST /api/v1/ingestion/upload`

Campos form-data:

- `source`: `bancolombia` o `nequi`
- `account_id`: id de cuenta destino
- `file`: archivo CSV/XLSX

Archivos de ejemplo:

- `data/samples/bancolombia_transactions.csv`
- `data/samples/nequi_transactions.csv`

## 9. Dashboard local

Con backend arriba, puedes usar dos opciones:

### Opcion A: dashboard con Docker (recomendada)

```bash
docker compose up -d --build
```

Abre:

- http://localhost:8502

### Opcion B: dashboard desde entorno local de Python

```bash
streamlit run dashboard/app.py
```

Flujo actual del dashboard:

- Pantalla inicial de Login y Registro
- Luego de autenticar, dos secciones privadas:
	- `Movimientos`: crear, editar y eliminar transacciones
	- `Dashboard`: metricas y graficos
- El sidebar solo muestra estado de sesion y boton de cierre de sesion

## 10. Ejecutar pruebas y cobertura

### Opcion A: local

```bash
pip install -r backend/requirements.txt
pytest backend/tests --cov=backend/app --cov-report=term-missing --cov-report=xml:backend/coverage.xml --cov-fail-under=85
```

### Opcion B: CI (GitHub Actions)

El pipeline `.github/workflows/ci.yml` ejecuta:

- Lint con Ruff
- Tests unitarios/integracion
- Verificacion de cobertura minima (85%)
- Publicacion del reporte de cobertura en Codecov
- Build smoke check

## 11. CI/CD (GitHub Actions)

### Flujo actual

- Workflow: `.github/workflows/ci.yml`
- Nombre del workflow: `Atlas Finance CI`
- Disparadores:
	- Push a `main` y `develop`
	- Pull Request contra cualquier rama

### Etapas del pipeline

1. **Checkout** del repositorio
2. **Setup Python 3.12**
3. **Instalacion de dependencias** desde `backend/requirements.txt`
4. **Lint** con Ruff sobre `backend/app` y `backend/tests`
5. **Tests + Coverage Gate** con `pytest` y cobertura minima `85%`
6. **Upload de cobertura** a Codecov (`backend/coverage.xml`)
7. **Build smoke check** compilando modulos Python (`compileall`)

### Variables usadas en CI

En el job de pruebas se inyectan variables para ejecucion aislada:

- `DATABASE_URL=sqlite+pysqlite:///:memory:`
- `SECRET_KEY=ci-secret-key`

### Como replicar CI en local

Desde la raiz del proyecto:

```bash
python -m pip install -r backend/requirements.txt
python -m ruff check backend/app backend/tests
python -m pytest backend/tests --cov=backend/app --cov-report=term-missing --cov-report=xml:backend/coverage.xml --cov-fail-under=85
python -m compileall backend/app
```

### Recomendaciones para despliegue futuro (fase SaaS)

- Agregar job de build y push de imagen Docker a un registry
- Agregar job de deploy (staging/production) con aprobacion manual
- Configurar secrets en GitHub (`SECRET_KEY`, credenciales de DB, etc.)
- Habilitar proteccion de rama `main` con CI obligatorio

## 12. Roadmap recomendado (siguientes fases)

- Multiusuario avanzado con roles
- Multi-tenant para SaaS
- Integracion con APIs bancarias reales
- Clasificacion AI-powered de transacciones
- Frontend web desacoplado (y apps mobile/desktop con UX especifica)
- Migraciones de BD (Alembic)
- Despliegue cloud automatizado

## 13. Notas de seguridad

- Cambiar `SECRET_KEY` en produccion
- Nunca subir `.env` al repositorio
- Usar HTTPS y rotacion de tokens en despliegues reales

## 14. Licencia

Este proyecto esta publicado bajo licencia MIT.

Consulta el texto completo en `LICENSE`.

## 15. Documentacion adicional recomendada

Este repositorio ya incluye plantillas base para colaboracion y mantenimiento:

- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
