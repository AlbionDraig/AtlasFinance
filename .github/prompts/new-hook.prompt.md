---
agent: 'ask'
description: 'Crea un custom hook para llamadas a la API con React Query'
---

Crea un custom hook de React Query para interactuar con un endpoint de la API.

Nombre del hook: ${input:name:Ej: useTransactions, useCreateBudget}
Tipo de operación: ${input:type:query (GET) | mutation (POST/PUT/DELETE)}
Endpoint: ${input:endpoint:Ej: GET /api/transactions?period=month}
Parámetros que recibe: ${input:params:Ej: period: string, category?: string | ninguno}

Genera `src/hooks/{name}.ts` con:

1. Tipos para los parámetros y la respuesta de la API
2. Función del hook con React Query (`useQuery` o `useMutation`)
3. `queryKey` que incluya todos los parámetros que afectan el resultado
4. `staleTime` y `gcTime` apropiados para el tipo de dato
5. Manejo de errores tipado
6. Si es mutation, incluir `onSuccess` e `onError` con `queryClient.invalidateQueries`

Convenciones:
- El cliente HTTP debe ser el que ya usa el proyecto (axios instance o fetch wrapper)
- Nunca hacer fetch directo con `axios` o `fetch` dentro del componente
- Los errores de la API deben mapearse a mensajes legibles para el usuario
- Exportar los tipos del hook para que los componentes los puedan usar
