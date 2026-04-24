---
agent: 'ask'
description: 'Crea un endpoint FastAPI completo con router, schema y service'
---

Crea un endpoint REST completo en FastAPI siguiendo la estructura del proyecto.

Nombre del recurso: ${input:resource:Ej: transaction, account, budget}
Método HTTP: ${input:method:GET | POST | PUT | DELETE}
Descripción de qué hace: ${input:description:Ej: Retorna todas las transacciones del usuario autenticado}
¿Requiere autenticación JWT?: ${input:auth:sí | no}

Genera los siguientes archivos (o actualiza los existentes si ya existen):

1. `app/routers/{resource}.py` — Router con el endpoint, dependencias y manejo de errores HTTP (400, 401, 404, 422, 500)
2. `app/schemas/{resource}.py` — Modelos Pydantic: Request, Response y cualquier modelo intermedio necesario. Incluir `model_config` con `from_attributes=True` si aplica
3. `app/services/{resource}_service.py` — Lógica de negocio separada del router, con excepciones propias si las necesita
4. Registra el router en `app/main.py` si no está registrado

Convenciones del proyecto:
- Usar `async def` en todos los endpoints
- Tipado estricto con anotaciones de tipo en todas las funciones
- Docstring en el endpoint con descripción para OpenAPI
- Errores deben lanzar `HTTPException` con detalle descriptivo
- Nunca retornar el modelo de base de datos directamente — siempre usar el schema de respuesta
