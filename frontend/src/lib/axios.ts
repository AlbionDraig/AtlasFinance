// axios.ts — cliente HTTP centralizado para hablar con la API de Atlas.
// Centralizar la instancia evita repetir baseURL y headers en cada módulo de api/*
// y permite enganchar interceptores globales (refresh silencioso, sesión expirada, etc.).
import axios, { type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const apiClient = axios.create({
  // VITE_API_URL permite apuntar a backends remotos en build; en dev se proxy-a /api/v1 vía Vite.
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  // withCredentials=true para que el navegador envíe la cookie httpOnly del refresh token.
  // Es imprescindible para el flujo de auth basado en cookie.
  withCredentials: true,
})

// ── Refresh silencioso ───────────────────────────────────────────────────────
// Cuando el access token expira (401) intentamos renovarlo una sola vez usando
// la cookie httpOnly de refresh token. Si el refresh también falla, hacemos
// logout y redirigimos a login con la bandera "session_expired".
//
// Para evitar múltiples llamadas paralelas al endpoint /auth/refresh mientras
// el primero está en vuelo, mantenemos una promesa compartida (_refreshPromise).
// Todas las peticiones fallidas esperan por la misma promesa y se reintentan
// en cuanto el nuevo access token queda disponible en la cookie.

let _refreshPromise: Promise<void> | null = null

// Marca en la config de la petición para detectar reintentos y evitar bucles.
interface RetryableConfig extends AxiosRequestConfig {
  _retry?: boolean
}

function forceLogout() {
  useAuthStore.getState().logout()
  sessionStorage.setItem('session_expired', '1')
  window.location.href = '/login'
}

async function refreshTokens(): Promise<void> {
  // Llamamos directamente con axios (no apiClient) para no disparar este
  // mismo interceptor de forma recursiva.
  await axios.post(
    '/api/v1/auth/refresh',
    {},
    { withCredentials: true, baseURL: window.location.origin },
  )
}

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config as RetryableConfig | undefined

    // Endpoints de auth: un 401 aquí significa credenciales inválidas,
    // no token expirado — mostramos el error inline sin redirigir.
    const isAuthEndpoint = (config?.url ?? '').includes('/auth/')

    if (err.response?.status === 401 && !isAuthEndpoint && config && !config._retry) {
      config._retry = true

      try {
        // Si ya hay un refresh en vuelo lo reutilizamos; si no, lanzamos uno nuevo.
        if (!_refreshPromise) {
          _refreshPromise = refreshTokens().finally(() => {
            _refreshPromise = null
          })
        }
        await _refreshPromise

        // Reintentamos la petición original con las cookies actualizadas.
        return apiClient(config)
      } catch {
        forceLogout()
        return Promise.reject(err)
      }
    }

    return Promise.reject(err)
  },
)

export default apiClient
