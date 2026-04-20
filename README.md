# Atlas Finance

Atlas Finance es una plataforma de gestion financiera personal (fase inicial de un futuro SaaS). Esta version esta pensada para un unico usuario, con arquitectura modular para escalar.

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
git clone <tu-repo>
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
- `POST /api/v1/accounts/`
- `POST /api/v1/categories/`

### 7.4 Registrar transaccion manual

Endpoint: `POST /api/v1/transactions/`

### 7.5 Consultar metricas

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

Con backend arriba y token JWT valido:

```bash
streamlit run dashboard/app.py
```

Luego en la barra lateral:

- Base URL de API (`http://localhost:8000/api/v1`)
- Token JWT
- Moneda objetivo
- Rango de fechas

## 10. Ejecutar pruebas y cobertura

### Opcion A: local

```bash
pip install -r backend/requirements.txt
pytest backend/tests --cov=backend/app --cov-report=term-missing --cov-fail-under=85
```

### Opcion B: CI (GitHub Actions)

El pipeline `.github/workflows/ci.yml` ejecuta:

- Lint con Ruff
- Tests unitarios/integracion
- Verificacion de cobertura minima (85%)
- Build smoke check

## 11. Roadmap recomendado (siguientes fases)

- Multiusuario avanzado con roles
- Multi-tenant para SaaS
- Integracion con APIs bancarias reales
- Clasificacion AI-powered de transacciones
- Frontend web desacoplado (y apps mobile/desktop con UX especifica)
- Migraciones de BD (Alembic)
- Despliegue cloud automatizado

## 12. Notas de seguridad

- Cambiar `SECRET_KEY` en produccion
- Nunca subir `.env` al repositorio
- Usar HTTPS y rotacion de tokens en despliegues reales
