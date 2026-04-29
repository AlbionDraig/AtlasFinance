import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/api/auth'
import AuthLoadingOverlay from '@/components/ui/AuthLoadingOverlay'
import FormField from '@/components/ui/FormField'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/useToast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('session_expired')) {
      sessionStorage.removeItem('session_expired')
      toast(t('auth.login.error_expired'), 'error')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Login endpoint sets auth cookie; then /me hydrates app user state.
      await authApi.login({ email: email.trim(), password: password.trim() })
      const { data: me } = await authApi.me()
      setUser(me)
      navigate('/dashboard')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const rawDetail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail

      // FastAPI may return detail as a string or as an array of validation error objects.
      const detail =
        typeof rawDetail === 'string'
          ? rawDetail
          : Array.isArray(rawDetail)
            ? (rawDetail as { msg?: string }[]).map((e) => e.msg).filter(Boolean).join(', ')
            : undefined

      if (status === 401 || status === 403) {
        if (detail?.toLowerCase().includes('invalid credentials')) {
          toast(t('auth.login.error_invalid'), 'error')
        } else {
          toast(detail ?? t('auth.login.error_bad_credentials'), 'error')
        }
      } else if (status === 422) {
        toast(t('auth.login.error_wrong_credentials'), 'error')
      } else if (status && status >= 500) {
        toast(t('auth.login.error_server'), 'error')
      } else if (status) {
        toast(detail ?? t('auth.login.error_unexpected'), 'error')
      } else {
        toast(t('auth.login.error_network'), 'error')
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
          title={t('auth.login.loading_title')}
          subtitle={t('auth.login.loading_subtitle')}
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
          {t('common.atlasFinance')}
        </h1>
        <p className="app-subtitle text-sm text-center mb-6">
          {t('auth.login.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label={t('auth.login.email_label')}
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.login.email_placeholder')}
          />
          <FormField
            label={t('auth.login.password_label')}
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.login.password_placeholder')}
          />
          <button
            type="submit"
            disabled={loading}
            className="app-btn-primary"
          >
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>

          <p className="text-center text-sm app-subtitle">
            {t('auth.login.no_account')}{' '}
            <Link to="/register" className="app-link">
              {t('auth.login.create_account')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
