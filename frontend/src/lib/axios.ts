// axios.ts — cliente HTTP centralizado para hablar con la API de Atlas.
// Centralizar la instancia evita repetir baseURL y headers en cada módulo de api/*
// y permite enganchar interceptores globales (sesión expirada, logging, etc.).
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const apiClient = axios.create({
  // VITE_API_URL permite apuntar a backends remotos en build; en dev se proxy-a /api/v1 vía Vite.
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  // withCredentials=true para que el navegador envíe la cookie httpOnly del refresh token.
  // Es imprescindible para el flujo de auth basado en cookie.
  withCredentials: true,
})

// Interceptor de respuestas: detecta sesiones expiradas y fuerza logout limpio.
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    // Excluimos endpoints /auth/* porque un 401 ahí (login fallido, refresh inválido)
    // NO debe disparar redirección: el formulario debe poder mostrar el error inline.
    const isAuthEndpoint = err.config?.url?.includes('/auth/')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      // Limpiamos el store para que ProtectedRoute reaccione y para que la UI no muestre datos stale.
      useAuthStore.getState().logout()
      // Bandera leída por LoginPage para mostrar "Tu sesión expiró" en vez de error genérico.
      sessionStorage.setItem('session_expired', '1')
      // window.location en lugar de navigate(): garantiza un reset completo del estado de React.
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default apiClient
