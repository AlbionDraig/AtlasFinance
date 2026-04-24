import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const persistedTheme = localStorage.getItem('atlas-theme')
const theme = persistedTheme === 'midnight' ? 'midnight' : 'clean'
document.documentElement.setAttribute('data-theme', theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
