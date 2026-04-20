# Contributing to Atlas Finance

Gracias por contribuir a Atlas Finance.

## Flujo recomendado

1. Crea una rama desde `main`.
2. Realiza cambios pequenos y enfocados.
3. Ejecuta el checklist de calidad completo antes de abrir PR o hacer push.
4. Abre Pull Request con descripcion clara del cambio.

## Convencion de ramas

- `feature/<descripcion-corta>`
- `fix/<descripcion-corta>`
- `chore/<descripcion-corta>`

## Checklist local antes del PR

```bash
python -m pip install -r backend/requirements.txt
python -m ruff check backend/app backend/tests
python -m pytest backend/tests --cov=backend/app --cov-report=term-missing --cov-report=xml:backend/coverage.xml --cov-fail-under=85
python -m py_compile frontend/main.py frontend/modules/config.py frontend/modules/api_client.py frontend/screens/auth.py frontend/screens/movements.py frontend/screens/dashboard.py
docker-compose config -q
git status --short
```

## Politica de calidad (obligatoria)

- No se permite commit o push si falla cualquier check de lint, pruebas o cobertura.
- La cobertura minima obligatoria es 85%.
- Todo cambio de frontend debe compilar sin errores de sintaxis.
- Toda modificacion de Docker/Compose debe pasar `docker-compose config -q`.
- Antes de subir cambios, revisar `git status --short` para evitar archivos no deseados.

## Estilo de codigo

- Mantener arquitectura por capas (api, services, models, etl, frontend)
- Preferir funciones pequenas y nombres descriptivos
- No incluir secretos o credenciales en commits

## Pull Requests

Incluye en el PR:

- Problema que resuelve
- Enfoque de solucion
- Riesgos o impacto
- Evidencia de pruebas (salida de tests o capturas)
