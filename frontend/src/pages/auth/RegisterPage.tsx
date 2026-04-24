import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import AuthLoadingOverlay from '@/components/ui/AuthLoadingOverlay'
import { useAuthStore } from '@/store/authStore'

type StrengthLevel = 'debil' | 'media' | 'fuerte'

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  }
}

function getPasswordStrength(password: string): { score: number; label: string; level: StrengthLevel } {
  const checks = getPasswordChecks(password)
  const passed = Object.values(checks).filter(Boolean).length
  const score = Math.round((passed / 4) * 100)

  if (score <= 25) return { score, label: 'Débil', level: 'debil' }
  if (score <= 75) return { score, label: 'Media', level: 'media' }
  return { score, label: 'Fuerte', level: 'fuerte' }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const checks = getPasswordChecks(password)
  const strength = getPasswordStrength(password)

  const strengthBarColor =
    strength.level === 'debil'
      ? 'var(--af-negative)'
      : strength.level === 'media'
        ? 'var(--af-warning)'
        : 'var(--af-positive)'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (fullName.trim().length < 2) {
      setError('El nombre completo debe tener al menos 2 caracteres.')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await authApi.register({
        email,
        full_name: fullName.trim(),
        password,
      })

      const { data: tokenData } = await authApi.login({ email, password })
      setToken(tokenData.access_token)

      const { data: me } = await authApi.me()
      setUser(me)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const maybeDetail =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null

      setError(maybeDetail ?? 'No se pudo crear la cuenta. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="blob blob-primary -top-40 -left-40 w-96 h-96" />
      <div className="blob blob-secondary -bottom-40 -right-40 w-96 h-96" />

      {loading && (
        <AuthLoadingOverlay
          title="Configurando tu cuenta"
          subtitle="Creando usuario e iniciando sesión..."
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
          Crea tu cuenta
        </p>

        {error && (
          <p className="mb-4 alert-error">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 app-subtitle">
              Nombre completo
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Sebastian Gutierrez Betancourt"
              className="app-control"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 app-subtitle">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu_correo@ejemplo.com"
              className="app-control"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 app-subtitle">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="app-control"
            />

            <div className="mt-2">
              <div className="flex items-center justify-between text-xs app-subtitle mb-1">
                <span>Fortaleza de contraseña</span>
                <span className="font-medium">{password ? strength.label : 'Sin definir'}</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--af-bg-soft)] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{ width: `${password ? strength.score : 0}%`, backgroundColor: strengthBarColor }}
                />
              </div>
            </div>

            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
              <li className={checks.minLength ? 'tone-positive' : 'app-subtitle'}>
                {checks.minLength ? '✓' : '•'} Mínimo 8 caracteres
              </li>
              <li className={checks.hasUpper ? 'tone-positive' : 'app-subtitle'}>
                {checks.hasUpper ? '✓' : '•'} Al menos una mayúscula
              </li>
              <li className={checks.hasNumber ? 'tone-positive' : 'app-subtitle'}>
                {checks.hasNumber ? '✓' : '•'} Al menos un número
              </li>
              <li className={checks.hasSymbol ? 'tone-positive' : 'app-subtitle'}>
                {checks.hasSymbol ? '✓' : '•'} Al menos un símbolo
              </li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 app-subtitle">
              Confirmar contraseña
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              className="app-control"
            />

            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs tone-negative">
                Las contraseñas no coinciden.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="app-btn-primary"
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>

          <p className="text-center text-sm app-subtitle">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="app-link">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
