---
agent: 'ask'
description: 'Crea modelos Pydantic para un recurso de la API'
---

Crea los schemas Pydantic en `app/schemas/` para el siguiente recurso.

Nombre del recurso: ${input:resource:Ej: Transaction, User, Budget}
Campos del modelo: ${input:fields:Ej: amount: float, category: str, date: datetime, description: str opcional}
¿Tiene modelo en la DB (SQLAlchemy)?: ${input:has_db_model:sí | no}

Genera `app/schemas/{resource_lower}.py` con:

1. `{Resource}Base` — campos comunes compartidos
2. `{Resource}Create` — campos requeridos para crear (hereda de Base)
3. `{Resource}Update` — todos los campos opcionales para PATCH (usar `Optional` en todos)
4. `{Resource}Response` — lo que retorna la API, incluir `id` y timestamps si aplican
5. `{Resource}ListResponse` — wrapper para listas: `items: list[{Resource}Response]` + `total: int`

Convenciones:
- Usar `model_config = ConfigDict(from_attributes=True)` en los schemas de respuesta
- Validaciones con `@field_validator` donde tenga sentido (ej: amount > 0, email válido)
- Agregar `json_schema_extra` con un ejemplo para que aparezca en la documentación de Swagger
- Usar `Annotated` con `Field()` para describir cada campo
- Fechas siempre como `datetime` con timezone aware
