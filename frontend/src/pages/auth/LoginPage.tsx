import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import AuthLoadingOverlay from '@/components/ui/AuthLoadingOverlay'
import FormField from '@/components/ui/FormField'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/useToast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('session_expired')) {
      sessionStorage.removeItem('session_expired')
      toast('Tu sesión ha expirado. Inicia sesión de nuevo.', 'error')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.login({ email, password })
      const { data: me } = await authApi.me()
      setUser(me)
      navigate('/dashboard')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const rawDetail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail

      // FastAPI may return detail as a string or as an array of validation error objects
      const detail =
        typeof rawDetail === 'string'
          ? rawDetail
          : Array.isArray(rawDetail)
            ? (rawDetail as { msg?: string }[]).map((e) => e.msg).filter(Boolean).join(', ')
            : undefined

      if (status === 401 || status === 403) {
        toast(detail ?? 'Credenciales inválidas. Verifica tu correo y contraseña.', 'error')
      } else if (status === 422) {
        toast('Credenciales incorrectas. Verifica tu correo y contraseña.', 'error')
      } else if (status && status >= 500) {
        toast('El servidor no respondió correctamente. Intenta de nuevo en unos segundos.', 'error')
      } else if (status) {
        toast(detail ?? 'Error inesperado. Intenta de nuevo.', 'error')
      } else {
        toast('No se pudo conectar con el servidor. Revisa tu conexión.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="blob blob-primary -top-40 -left-40 w-96 h-96" />
      <div className="blob blob-secondary -bottom-40 -right-40 w-96 h-96" />

      {loading && (
        <AuthLoadingOverlay
          title="Iniciando sesión"
          subtitle="Validando tus credenciales..."
        />
      )}

      <div className="relative w-full max-w-sm app-panel p-8">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--af-accent)] flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V17a1 1 0 11-2 0v-.07A7.003 7.003 0 015 10h1a6 6 0 0012 0h1a7.003 7.003 0 01-6 6.93z" />
            </svg>
          </div>
        </div>

        <h1 className="app-title text-2xl text-center mb-1 tracking-tight">
          Atlas Finance
        </h1>
        <p className="app-subtitle text-sm text-center mb-6">
          Inicia sesión en tu cuenta
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu_correo@ejemplo.com"
          />
          <FormField
            label="Contraseña"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
          />
          <button
            type="submit"
            disabled={loading}
            className="app-btn-primary"
          >
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>

          <p className="text-center text-sm app-subtitle">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="app-link">
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
