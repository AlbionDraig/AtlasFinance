---
agent: 'ask'
description: 'Crea un componente React para Atlas Finance'
---

Crea un componente React para Atlas Finance siguiendo el sistema de diseño del proyecto.

#file:../copilot-instructions.md

Nombre del componente: ${input:name:Ej: TransactionCard, BudgetBar, AccountSummary}
Qué hace: ${input:description:Ej: Muestra una transacción con ícono, categoría, monto y fecha}
Props que recibe: ${input:props:Ej: amount: number, category: string, date: string, type: income | expense}
¿Tiene estado interno?: ${input:has_state:sí | no}
¿Llama a la API?: ${input:calls_api:sí — indica el endpoint | no}

Genera `src/components/{Name}/{Name}.tsx` con:

1. Interface TypeScript para las props
2. Componente funcional con Tailwind usando los tokens del design system
3. Si llama a la API, usar React Query (`useQuery` o `useMutation`)
4. Estados de loading y error si aplica
5. Exportación named y default

Convenciones:
- Solo `font-normal` y `font-medium` — nunca `font-bold` ni `font-semibold`
- No usar colores arbitrarios de Tailwind — solo los tokens del design system
- Componente debe ser accesible (roles ARIA donde aplique)
- Exportar también los tipos si otros componentes los necesitan
