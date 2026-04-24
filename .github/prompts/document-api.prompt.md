---
agent: 'ask'
description: 'Documenta un endpoint o módulo del proyecto'
---

Documenta el archivo activo o el módulo indicado.

Archivo a documentar: ${input:file:Ej: app/routers/transactions.py — o "el archivo activo"}

Genera la documentación en estos niveles:

**1. Docstrings en el código**
- Docstring de módulo al inicio del archivo
- Docstring en cada función/clase pública con: descripción, parámetros, retorno y excepciones posibles
- Usar formato compatible con FastAPI/OpenAPI (para que aparezca en `/docs`)

**2. Anotaciones OpenAPI en los endpoints FastAPI**
- `summary` y `description` en cada endpoint
- `responses` con los códigos HTTP posibles y su descripción
- `tags` para agrupar en la documentación
- Ejemplos en los schemas Pydantic si no los tienen

**3. Actualización del README**
- Si el archivo es un router, agrega o actualiza la sección de endpoints en el README
- Formato de tabla: Método | Ruta | Descripción | Auth requerida

No cambies la lógica del código — solo agrega documentación. Si ya existe documentación, actualízala para que sea precisa con el código actual.
