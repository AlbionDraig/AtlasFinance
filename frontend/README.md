# Atlas Finance — Frontend

SPA en **React 19 + TypeScript + Vite** que consume la API FastAPI en `/api/v1`.

> Para la visión global del proyecto y el stack completo, consulta el [README raíz](../README.md).

## Quick start

```bash
npm ci
npm run dev          # Vite en http://localhost:5173
```

Variables de entorno (`.env.local`):

```env
VITE_API_URL=http://localhost:8000/api/v1
```

En Docker el host es `http://localhost:8502` (mapeado desde el contenedor `:8501`).

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR. |
| `npm run build` | `tsc -b` + `vite build` (output en `dist/`). |
| `npm run preview` | Sirve el build prod localmente. |
| `npm run lint` | ESLint sobre `src/`. |
| `npm run test` | Vitest en modo watch + UI. |
| `npm run test:coverage` | Vitest single-run con LCOV. |
| `npm run test:e2e` | Playwright E2E (requiere backend en `:8000`). |

## Estructura

```text
src/
├── api/                 # Clientes axios tipados por recurso
├── components/ui/       # Primitivas (Modal, Toast, EmptyState, SkeletonCard)
├── hooks/               # useToast, useCatalogQueries, useAccountsData, …
├── i18n/
│   ├── index.ts         # Init i18next
│   └── locales/         # es.json, en.json
├── layouts/AppLayout.tsx
├── lib/                 # axios.ts, utils.ts, passwordStrength.ts
├── pages/               # Una carpeta por página (con sus componentes locales)
├── store/               # Zustand auth store
├── types/               # Tipos compartidos
├── App.tsx              # Router + ErrorBoundary
└── main.tsx             # Bootstrap + QueryClientProvider + i18n
```

## Convenciones clave

### Tokens de diseño (obligatorio)

Todos los colores deben venir de `tailwind.config.js`. Está prohibido usar la escala default de Tailwind (`red-500`, `green-600`, etc.). Reglas detalladas: [`.github/copilot-instructions.md`](../.github/copilot-instructions.md).

| Uso | Clase |
|-----|-------|
| Acción primaria | `bg-brand text-white hover:bg-brand-hover` |
| Métricas positivas | `text-success` |
| Advertencias | `text-warning` |
| Patrimonio / marca | `text-brand` |
| Fondo de página | `bg-neutral-50` |
| Texto principal | `text-neutral-900` |

### React Query

- `QueryClient` en `main.tsx` (`staleTime: 30s`, `retry: 1`).
- DevTools montadas en dev (`buttonPosition="bottom-left"`).
- `QUERY_KEYS` centralizadas en `hooks/useCatalogQueries.ts`.
- Tras una mutación: `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.<x> })`.

### i18n

- Toda string visible vive en `i18n/locales/{en,es}.json`.
- Uso: `const { t } = useTranslation()` → `t('section.key')`.

### Auth

- JWT en Zustand store (`store/authStore.ts`) persistido en `localStorage`.
- Interceptor en `lib/axios.ts` adjunta `Authorization: Bearer …` y refresca tokens.

## Tests

### Vitest (unit)

```bash
npm run test:coverage
```

Umbrales por archivo definidos en `vitest.config.ts` (`lib/utils.ts` 90%, `passwordStrength.ts` 90%).

### Playwright (E2E)

```bash
# Backend levantado en localhost:8000
npm run test:e2e
```

Specs en `e2e/`. La config arranca `npm run dev` automáticamente cuando se corre local.

## Build & deploy

```bash
npm run build
# dist/ contiene el bundle estático listo para servir desde nginx/CDN
```

## Troubleshooting

- **Pantalla en blanco después de `npm install`**: el volumen anónimo de Docker `/app/frontend/node_modules` está stale. Reconstruir imagen + recrear volumen (ver README §5).
- **HMR no actualiza dentro de Docker**: `CHOKIDAR_USEPOLLING=true` ya está seteado en `docker-compose.yml`.
- **CORS errors**: verificar `VITE_API_URL` y que el backend esté con CORS habilitado para el origen actual.
