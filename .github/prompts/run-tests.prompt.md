---
agent: 'ask'
description: 'Ejecuta la suite completa de tests con cobertura'
---

Ejecuta el siguiente comando en la terminal del proyecto:

```bash
pytest -q tests/integration/test_api_flow.py tests/integration/test_auth_routes.py tests/unit/test_auth_service.py tests/unit/test_classifier.py tests/unit/test_finance_service.py tests/unit/test_currency_service.py --cov=app --cov-report=term-missing:skip-covered
```

Cuando termine, analiza el output y reporta:

1. Cuántos tests pasaron, fallaron o tienen errores
2. Si hay tests fallando, muestra el traceback y explica la causa probable
3. El porcentaje de cobertura general de `app`
4. Los archivos con cobertura más baja (menos del 80%) y qué líneas no están cubiertas
5. Si hay warnings relevantes, menciónalos

Si algún test falla, propón el fix directamente en el código sin pedirme confirmación.
