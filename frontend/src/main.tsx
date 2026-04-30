// main.tsx — bootstrap de la aplicación React.
// Se mantiene mínimo: solo monta <App /> y aplica el tema antes del primer render
// para evitar el "flash" de tema incorrecto (FOUC) si lo aplicáramos dentro de React.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './index.css'
import './i18n' // Inicializa i18next en el side-effect del import (debe ocurrir antes que App).
import App from './App.tsx'

// Aplicamos el tema persistido sincrónicamente sobre <html> ANTES de renderizar.
// Hacerlo aquí (no en useEffect) garantiza que el primer paint ya use el tema correcto.
const persistedTheme = localStorage.getItem('atlas-theme')
const theme = persistedTheme === 'midnight' ? 'midnight' : 'clean' // fallback seguro a 'clean' si el valor está corrupto.
document.documentElement.setAttribute('data-theme', theme)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,   // 30 s antes de considerar los datos stale
      retry: 1,
    },
  },
})

// StrictMode habilita checks de desarrollo (doble-render de efectos, deprecation warnings).
// No afecta producción.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  </StrictMode>,
)
