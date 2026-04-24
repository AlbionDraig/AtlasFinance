---
agent: 'ask'
description: 'Genera tests unitarios y de integración para un service o endpoint'
---

Genera tests para el siguiente archivo del proyecto.

Archivo a testear: ${input:file:Ej: app/services/finance_service.py}
Tipo de tests: ${input:type:unitarios | integración | ambos}
Casos a cubrir: ${input:cases:Ej: caso feliz, usuario no encontrado, monto negativo — o "todos los casos"}

Genera el archivo de tests correspondiente siguiendo la estructura de `tests/` del proyecto:

1. Fixtures necesarios en el archivo o en `conftest.py` si son reutilizables
2. Mocks para dependencias externas (DB, servicios externos, APIs)
3. Un test por caso de uso — nombres descriptivos: `test_should_{behavior}_when_{condition}`
4. Assertions específicas — no solo `assert response.status_code == 200`

Para tests de integración de endpoints FastAPI:
- Usar `AsyncClient` de `httpx` con la app de FastAPI
- Mockear la DB con una base de datos de test en memoria o fixtures
- Probar los códigos HTTP correctos en cada caso (200, 201, 400, 401, 404, 422)

Para tests unitarios de services:
- Aislar completamente de la DB usando mocks de SQLAlchemy
- Testear la lógica de negocio pura, no los detalles de implementación
- Cubrir los casos de error con `pytest.raises`

Al final, ejecuta los tests nuevos para verificar que pasan:
```bash
pytest {ruta_del_archivo_de_test} -v
```
