---
agent: 'ask'
description: 'Revisa el código del archivo o PR actual'
---

Haz una revisión de código del archivo activo o los cambios recientes.

Revisa el código en el contexto del proyecto y reporta en estas categorías:

**Seguridad**
- Inputs sin validar o sanitizar
- Queries SQL con riesgo de inyección
- Secretos o credenciales hardcodeadas
- Endpoints sin autenticación que deberían tenerla
- Datos sensibles expuestos en responses o logs

**Performance**
- Queries N+1 a la base de datos
- Operaciones síncronas bloqueantes en código async
- Cálculos costosos que deberían cachearse
- Respuestas grandes sin paginación

**Consistencia con el proyecto**
- Convenciones de nombres que no se siguen
- Patrones que difieren del resto del codebase
- Imports no utilizados o innecesarios
- Tipos `Any` o `dict` sin tipar

**Manejo de errores**
- Excepciones capturadas sin manejo real (`pass` o `print`)
- Errores que deberían propagarse pero se silencian
- Mensajes de error que exponen detalles internos al cliente

Para cada problema encontrado: indica el archivo, la línea aproximada, qué está mal y cómo corregirlo. Clasifica cada item como `crítico`, `importante` o `sugerencia`.

Al final da un resumen de cuántos items hay por categoría.
