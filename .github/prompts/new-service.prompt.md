---
agent: 'ask'
description: 'Crea un service de FastAPI con inyección de dependencias'
---

Crea un service en `app/services/` siguiendo el patrón de inyección de dependencias del proyecto.

Nombre del service: ${input:name:Ej: FinanceService, AuthService}
Responsabilidad principal: ${input:responsibility:Ej: Calcular métricas financieras del usuario}
¿Depende de la base de datos?: ${input:uses_db:sí | no}
¿Depende de otro service?: ${input:dependencies:Ej: CurrencyService, ninguno}

Genera `app/services/{name_snake}.py` con:

1. Clase del service con `__init__` que recibe dependencias por parámetro
2. Métodos `async` para cada operación
3. Excepciones propias en `app/exceptions.py` si necesita errores de dominio
4. Función `get_{name_snake}` para usar como `Depends()` en los routers
5. Tipado completo — sin `Any`, sin `dict` sin tipar

Convenciones:
- Toda lógica de negocio va en el service, nunca en el router
- Si accede a la DB, recibir la sesión como dependencia (`db: AsyncSession = Depends(get_db)`)
- Los métodos deben ser testeables de forma aislada (sin estado global)
- Incluir docstring en la clase y en cada método público
