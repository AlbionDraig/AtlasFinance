---
agent: 'ask'
description: 'Analiza un test fallando y propone el fix'
---

Analiza el siguiente test fallando y propón el fix.

Ejecuta primero los tests para ver el estado actual:
```bash
pytest -q tests/ --tb=short 2>&1 | head -80
```

Con el output del error:
1. Identifica si el problema está en el test o en el código de producción
2. Muestra el traceback relevante y explica la causa raíz en términos simples
3. Propón el fix en el archivo correcto (no parches — arregla el problema real)
4. Aplica el fix
5. Vuelve a correr solo el test afectado para confirmar que pasa:
```bash
pytest {archivo_del_test}::{nombre_del_test} -v
```
6. Corre la suite completa para asegurarse de que no se rompió nada más:
```bash
pytest -q tests/ --tb=short
```

Si el problema es un cambio de comportamiento intencional (refactor, nueva feature), actualiza el test para reflejar el comportamiento nuevo — pero solo si el comportamiento nuevo es correcto.
