import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/api/auth'
import AuthLoadingOverlay from '@/components/ui/AuthLoadingOverlay'
import BrandLogo from '@/components/ui/BrandLogo'
import FormField from '@/components/ui/FormField'
import InlineAlert from '@/components/ui/InlineAlert'
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
  const [submitError, setSubmitError] = useState<string | null>(null)

  const checks = getPasswordChecks(password)
  const strength = getPasswordStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (fullName.trim().length < 2) {
      const message = t('auth.register.error_name_short')
      setSubmitError(message)
      toast(message, 'error')
      return
    }

    if (password.length < 8) {
      const message = t('auth.register.error_password_short')
      setSubmitError(message)
      toast(message, 'error')
      return
    }

    if (password !== confirmPassword) {
      const message = t('auth.register.error_passwords_mismatch')
      setSubmitError(message)
      toast(message, 'error')
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
        const message = t('auth.register.error_email_taken')
        setSubmitError(message)
        toast(message, 'error')
      } else if (status === 422) {
        const message = t('auth.register.error_invalid_data')
        setSubmitError(message)
        toast(message, 'error')
      } else if (status && status >= 500) {
        const message = t('auth.register.error_server')
        setSubmitError(message)
        toast(message, 'error')
      } else if (!status) {
        const message = t('auth.register.error_network')
        setSubmitError(message)
        toast(message, 'error')
      } else {
        const message = detail ?? t('auth.register.error_generic')
        setSubmitError(message)
        toast(message, 'error')
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
          <BrandLogo showText={false} iconSizeClassName="h-12 w-12" className="flex justify-center" />
        </div>

        <h1 className="app-title text-2xl text-center mb-1 tracking-tight">
          {t('common.atlasFinance')}
        </h1>
        <p className="app-subtitle text-sm text-center mb-6">
          {t('auth.register.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && <InlineAlert message={submitError} variant="warning" />}

          <FormField
            label={t('auth.register.fullname_label')}
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              if (submitError) setSubmitError(null)
            }}
            placeholder={t('auth.register.fullname_placeholder')}
          />

          <FormField
            label={t('auth.register.email_label')}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (submitError) setSubmitError(null)
            }}
            placeholder={t('auth.register.email_placeholder')}
          />

          <FormField label={t('auth.register.password_label')}>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (submitError) setSubmitError(null)
              }}
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
                {checks.minLength ? '\u2713' : '\u2022'} {t('auth.register.req_length')}
              </li>
              <li className={checks.hasUpper ? 'tone-positive' : 'app-subtitle'}>
                {checks.hasUpper ? '\u2713' : '\u2022'} {t('auth.register.req_uppercase')}
              </li>
              <li className={checks.hasNumber ? 'tone-positive' : 'app-subtitle'}>
                {checks.hasNumber ? '\u2713' : '\u2022'} {t('auth.register.req_number')}
              </li>
              <li className={checks.hasSymbol ? 'tone-positive' : 'app-subtitle'}>
                {checks.hasSymbol ? '\u2713' : '\u2022'} {t('auth.register.req_symbol')}
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
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (submitError) setSubmitError(null)
              }}
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
