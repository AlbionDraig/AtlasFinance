// main.tsx — bootstrap de la aplicación React.
// Se mantiene mínimo: solo monta <App /> y aplica el tema antes del primer render
// para evitar el "flash" de tema incorrecto (FOUC) si lo aplicáramos dentro de React.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n' // Inicializa i18next en el side-effect del import (debe ocurrir antes que App).
import App from './App.tsx'

// Aplicamos el tema persistido sincrónicamente sobre <html> ANTES de renderizar.
// Hacerlo aquí (no en useEffect) garantiza que el primer paint ya use el tema correcto.
const persistedTheme = localStorage.getItem('atlas-theme')
const theme = persistedTheme === 'midnight' ? 'midnight' : 'clean' // fallback seguro a 'clean' si el valor está corrupto.
document.documentElement.setAttribute('data-theme', theme)

// StrictMode habilita checks de desarrollo (doble-render de efectos, deprecation warnings).
// No afecta producción.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
