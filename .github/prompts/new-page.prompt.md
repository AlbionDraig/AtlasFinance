---
agent: 'ask'
description: 'Crea una página completa en React con llamadas a la API'
---

Crea una página completa para Atlas Finance.

#file:../copilot-instructions.md

Nombre de la página: ${input:name:Ej: TransactionsPage, BudgetPage}
Ruta en el router: ${input:route:Ej: /transactions, /budget}
Qué muestra: ${input:description:Ej: Lista de transacciones con filtros por fecha y categoría}
Endpoints que consume: ${input:endpoints:Ej: GET /api/transactions, GET /api/categories}

Genera los siguientes archivos:

1. `src/pages/{Name}/{Name}.tsx` — Página principal con layout, estados loading/error/empty
2. `src/pages/{Name}/hooks/use{Name}.ts` — Custom hook con React Query para los datos
3. `src/pages/{Name}/types.ts` — Tipos TypeScript específicos de la página
4. Agrega la ruta en el router del proyecto si existe

Convenciones:
- Usar `useQuery` con `queryKey` descriptivo y `staleTime` apropiado
- Estado de carga: mostrar skeleton o spinner (no dejar pantalla en blanco)
- Estado de error: mostrar mensaje descriptivo con opción de reintentar
- Estado vacío: mensaje útil cuando no hay datos
- Separar la lógica de fetching del componente visual (en el hook)
- Tipar el response de la API, nunca usar `any`
