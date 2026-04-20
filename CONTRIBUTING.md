# Contributing to Atlas Finance

Gracias por contribuir a Atlas Finance.

## Flujo recomendado

1. Crea una rama desde `main`.
2. Realiza cambios pequenos y enfocados.
3. Ejecuta lint y pruebas antes de abrir PR.
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
```

## Estilo de codigo

- Mantener arquitectura por capas (api, services, models, etl, dashboard)
- Preferir funciones pequenas y nombres descriptivos
- No incluir secretos o credenciales en commits

## Pull Requests

Incluye en el PR:

- Problema que resuelve
- Enfoque de solucion
- Riesgos o impacto
- Evidencia de pruebas (salida de tests o capturas)
