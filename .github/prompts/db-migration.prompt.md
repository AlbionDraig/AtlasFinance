---
agent: 'ask'
description: 'Genera y ejecuta una migración Alembic'
---

Genera y aplica una migración de base de datos con Alembic.

Descripción del cambio: ${input:change:Ej: Agregar columna currency a la tabla transactions}

Pasos a ejecutar:

1. Revisa los modelos SQLAlchemy en `app/models/` para entender el cambio necesario
2. Si el modelo aún no tiene el cambio, actualízalo primero
3. Genera la migración automática:
```bash
alembic revision --autogenerate -m "${input:change}"
```
4. Abre el archivo de migración generado en `alembic/versions/` y verifica que:
   - El `upgrade()` y `downgrade()` son correctos
   - No hay operaciones peligrosas sin confirmación (drop de columnas con datos)
   - Los índices necesarios están incluidos
5. Si todo se ve bien, aplica la migración:
```bash
alembic upgrade head
```
6. Confirma el estado final con:
```bash
alembic current
```

Si hay algún problema con la migración generada, corrígelo antes de aplicarla. Nunca aplicar una migración con `downgrade()` vacío o incorrecto.
