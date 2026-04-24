---
agent: 'ask'
description: 'Analiza un traceback y propone el fix con contexto del proyecto'
---

Analiza el siguiente error y propón el fix.

Pega el traceback o mensaje de error: ${input:error:Pega aquí el error completo}

Pasos:
1. Lee el traceback de abajo hacia arriba — identifica dónde se origina el error real (no donde se propaga)
2. Abre los archivos del proyecto mencionados en el traceback
3. Explica la causa raíz en términos simples (una oración)
4. Muestra exactamente qué línea/bloque está causando el problema
5. Propón el fix y aplícalo directamente
6. Si el error puede repetirse en otros lugares del código con el mismo patrón, menciónalos

Contexto adicional si lo tienes: ${input:context:Ej: Ocurre solo cuando el usuario no tiene transacciones, o "ninguno"}

Después de aplicar el fix, si hay un test que cubra este caso, ejecuta ese test para confirmar:
```bash
pytest -q -k "{keyword_relacionado}" --tb=short
```

Si no hay test para este caso, crea uno que hubiera detectado el bug.
