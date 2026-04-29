import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/api/auth'
import AuthLoadingOverlay from '@/components/ui/AuthLoadingOverlay'
import FormField from '@/components/ui/FormField'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/useToast'
import { getPasswordChecks, getPasswordStrength } from '@/lib/passwordStrength'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const checks = getPasswordChecks(password)
  const strength = getPasswordStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (fullName.trim().length < 2) {
      toast(t('auth.register.error_name_short'), 'error')
      return
    }

    if (password.length < 8) {
      toast(t('auth.register.error_password_short'), 'error')
      return
    }

    if (password !== confirmPassword) {
      toast(t('auth.register.error_passwords_mismatch'), 'error')
      return
    }

    setLoading(true)
    try {
      // Registration is followed by immediate login to reduce friction.
      const cleanEmail = email.trim()
      const cleanPassword = password.trim()

      await authApi.register({
        email: cleanEmail,
        full_name: fullName.trim(),
        password: cleanPassword,
      })

      await authApi.login({ email: cleanEmail, password: cleanPassword })
      const { data: me } = await authApi.me()
      setUser(me)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      // Normalize backend error payload to readable messages.
      const res = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response
      const status = res?.status
      const rawDetail = res?.data?.detail
      const detail =
        typeof rawDetail === 'string'
          ? rawDetail
          : Array.isArray(rawDetail)
            ? (rawDetail as { msg?: string }[]).map((e) => e.msg).filter(Boolean).join(', ')
            : undefined

      if (status === 409 || (typeof detail === 'string' && detail.toLowerCase().includes('already'))) {
        toast(t('auth.register.error_email_taken'), 'error')
      } else if (status === 422) {
        toast(t('auth.register.error_invalid_data'), 'error')
      } else if (status && status >= 500) {
        toast(t('auth.register.error_server'), 'error')
      } else if (!status) {
        toast(t('auth.register.error_network'), 'error')
      } else {
        toast(detail ?? t('auth.register.error_generic'), 'error')
      }
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
          title={t('auth.register.loading_title')}
          subtitle={t('auth.register.loading_subtitle')}
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
          {t('auth.register.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label={t('auth.register.fullname_label')}
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('auth.register.fullname_placeholder')}
          />

          <FormField
            label={t('auth.register.email_label')}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.register.email_placeholder')}
          />

          <FormField label={t('auth.register.password_label')}>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.register.password_placeholder')}
              className="app-control"
            />

            <div className="mt-2">
              <div className="flex items-center justify-between text-xs app-subtitle mb-1">
                <span>{t('auth.register.password_strength')}</span>
                <span className="font-medium">{password ? strength.label : t('auth.register.password_undefined')}</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--af-bg-soft)] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{ width: `${password ? strength.score : 0}%`, backgroundColor: strength.color }}
                />
              </div>
            </div>

            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
              <li className={checks.minLength ? 'tone-positive' : 'app-subtitle'}>
                {checks.minLength ? 'âœ“' : 'â€¢'} {t('auth.register.req_length')}
              </li>
              <li className={checks.hasUpper ? 'tone-positive' : 'app-subtitle'}>
                {checks.hasUpper ? 'âœ“' : 'â€¢'} {t('auth.register.req_uppercase')}
              </li>
              <li className={checks.hasNumber ? 'tone-positive' : 'app-subtitle'}>
                {checks.hasNumber ? 'âœ“' : 'â€¢'} {t('auth.register.req_number')}
              </li>
              <li className={checks.hasSymbol ? 'tone-positive' : 'app-subtitle'}>
                {checks.hasSymbol ? 'âœ“' : 'â€¢'} {t('auth.register.req_symbol')}
              </li>
            </ul>
          </FormField>

          <FormField
            label={t('auth.register.confirm_label')}
            error={confirmPassword && password !== confirmPassword ? t('auth.register.confirm_error') : undefined}
          >
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.register.confirm_placeholder')}
              className="app-control"
            />
          </FormField>

          <button
            type="submit"
            disabled={loading}
            className="app-btn-primary"
          >
            {loading ? t('auth.register.submitting') : t('auth.register.submit')}
          </button>

          <p className="text-center text-sm app-subtitle">
            {t('auth.register.has_account')}{' '}
            <Link to="/login" className="app-link">
              {t('auth.register.sign_in')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
