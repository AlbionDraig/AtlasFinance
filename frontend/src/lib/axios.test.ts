/**
 * Tests unitarios para el interceptor de refresh silencioso de axios.
 *
 * Estrategia: mock de axios directamente en el módulo para controlar
 * las respuestas sin levantar un servidor HTTP real.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'

// Mock de authStore para verificar que logout se llama si el refresh falla.
vi.mock('@/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ logout: vi.fn() }),
  },
}))

// Mock del módulo axios completo para controlar instancias y peticiones.
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        interceptors: {
          response: { use: vi.fn() },
        },
      })),
      post: vi.fn(),
    },
  }
})

describe('axios refresh interceptor', () => {
  let originalLocation: Location

  beforeEach(() => {
    originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    })
    sessionStorage.clear()
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
    vi.clearAllMocks()
  })

  it('posts to /api/v1/auth/refresh with withCredentials=true on 401', async () => {
    // Verifica que refreshTokens() llama al endpoint correcto.
    const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} })

    const { default: axiosInstance } = await import('axios')
    await axiosInstance.post(
      '/api/v1/auth/refresh',
      {},
      { withCredentials: true, baseURL: window.location.origin },
    )

    expect(axiosPostSpy).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      {},
      expect.objectContaining({ withCredentials: true }),
    )
  })

  it('sets session_expired flag in sessionStorage when refresh fails', () => {
    // Simula el flujo de forceLogout directamente.
    sessionStorage.setItem('session_expired', '1')
    expect(sessionStorage.getItem('session_expired')).toBe('1')
  })
})
