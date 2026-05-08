import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/useToast'
import { getPasswordChecks, getPasswordStrength } from '@/lib/passwordStrength'

interface FormState {
  full_name: string
  email: string
  current_password: string
  new_password: string
  confirm_password: string
}

type ProfileFormErrors = Partial<Record<keyof FormState, string>>

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const { toast } = useToast()
  const { t } = useTranslation()

  const [form, setForm] = useState<FormState>({
    full_name: user?.full_name ?? '',
    email: user?.email ?? '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [loading, setLoading] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [errors, setErrors] = useState<ProfileFormErrors>({})

  const pwChecks = useMemo(() => getPasswordChecks(form.new_password), [form.new_password])
  const pwStrength = useMemo(() => getPasswordStrength(form.new_password), [form.new_password])
  const confirmMatch = form.confirm_password.length > 0 && form.confirm_password === form.new_password

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, full_name: user.full_name, email: user.email }))
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const field = e.target.name as keyof FormState
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const nextErrors: ProfileFormErrors = {}
    if (form.full_name.trim().length < 2) nextErrors.full_name = t('profile.toast_name_short')
    if (!form.email.trim()) nextErrors.email = t('profile.toast_email_required')

    // Password rules are only enforced when user explicitly enables password change.
    if (changingPassword) {
      if (!form.current_password) nextErrors.current_password = t('profile.toast_current_password_required')
      if (form.new_password.length < 8) nextErrors.new_password = t('profile.toast_new_password_short')
      if (form.new_password !== form.confirm_password) nextErrors.confirm_password = t('profile.toast_passwords_mismatch')
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      const firstError = Object.values(nextErrors)[0]
      if (firstError) {
        toast(firstError, 'error')
      }
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, string> = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
      }
      if (changingPassword) {
        payload.current_password = form.current_password
        payload.new_password = form.new_password
      }

      const res = await authApi.updateProfile(payload)
      setUser(res.data)
      toast(t('profile.toast_updated'), 'success')
      setForm((f) => ({ ...f, current_password: '', new_password: '', confirm_password: '' }))
      setChangingPassword(false)
    } catch (err: unknown) {
      // Map backend/domain errors to user-friendly Spanish messages.
      const status = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response?.status
      const rawDetail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      const detail = typeof rawDetail === 'string' ? rawDetail : undefined

      if (status === 400) {
        if (detail?.includes('already in use') || detail?.includes('already registered')) {
          toast(t('profile.toast_email_taken'), 'error')
        } else if (detail?.includes('Incorrect current password')) {
          toast(t('profile.toast_wrong_password'), 'error')
        } else if (detail?.includes('current_password is required')) {
          toast(t('profile.toast_current_password_missing'), 'error')
        } else {
          toast(detail ?? t('profile.toast_save_error'), 'error')
        }
      } else if (status && status >= 500) {
        toast(t('profile.toast_server_error'), 'error')
      } else if (!status) {
        toast(t('profile.toast_network_error'), 'error')
      } else {
        toast(t('profile.toast_save_error'), 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <main className="app-page bg-neutral-50 min-h-screen p-6 md:p-10">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-medium text-neutral-900">{t('profile.title')}</h1>
          <p className="text-sm text-neutral-700 mt-0.5">{t('profile.subtitle')}</p>
        </div>

        {/* Avatar banner */}
        <div className="bg-white border border-neutral-100 rounded-xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-brand w-full" />
          <div className="px-6 py-5 flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-xl font-medium text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-medium text-neutral-900 truncate">{user?.full_name}</p>
              <p className="text-sm text-neutral-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-neutral-100 rounded-xl overflow-hidden">

          {/* Sección: Información personal */}
          <div className="px-6 pt-5 pb-1">
            <p className="text-xs font-medium tracking-widest uppercase text-neutral-700">{t('profile.section_personal')}</p>
          </div>

          <div className="px-6 pb-6 space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Nombre */}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="full_name" className="app-label">{t('profile.field_fullname')}</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  className={`app-control ${errors.full_name ? 'border-warning' : ''}`}
                  value={form.full_name}
                  onChange={handleChange}
                  autoComplete="name"
                />
                {errors.full_name && <p className="mt-1 text-xs tone-negative">{errors.full_name}</p>}
              </div>

              {/* Correo */}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="email" className="app-label">{t('profile.field_email')}</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`app-control ${errors.email ? 'border-warning' : ''}`}
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                {errors.email && <p className="mt-1 text-xs tone-negative">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-100" />

          {/* Sección: Contraseña */}
          <div className="px-6 pt-5 pb-1">
            <p className="text-xs font-medium tracking-widest uppercase text-neutral-700">{t('profile.section_password')}</p>
          </div>

          <div className="px-6 pb-6 mt-4 space-y-4">
            {!changingPassword ? (
              <div className="flex items-center justify-between py-2.5 px-4 bg-neutral-50 rounded-lg border border-neutral-100">
                <span className="text-sm text-neutral-400 tracking-widest">{t('profile.password_masked')}</span>
                <button
                  type="button"
                  onClick={() => setChangingPassword(true)}
                  className="text-xs font-medium text-neutral-700 border border-neutral-100 bg-white hover:border-neutral-400 hover:text-neutral-900 rounded-md px-3 py-1 transition-colors"
                >
                  {t('profile.password_change_btn')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label htmlFor="current_password" className="app-label">{t('profile.field_current_password')}</label>
                  <input
                    id="current_password"
                    name="current_password"
                    type="password"
                    className={`app-control [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_white] ${errors.current_password ? 'border-warning' : ''}`}
                    value={form.current_password}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                  {errors.current_password && <p className="mt-1 text-xs tone-negative">{errors.current_password}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="new_password" className="app-label">{t('profile.field_new_password')}</label>
                  <input
                    id="new_password"
                    name="new_password"
                    type="password"
                    className={`app-control [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_white] ${errors.new_password ? 'border-warning' : ''}`}
                    value={form.new_password}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  {errors.new_password && <p className="mt-1 text-xs tone-negative">{errors.new_password}</p>}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                      <span>{t('profile.password_strength')}</span>
                      <span className="font-medium" style={{ color: form.new_password ? pwStrength.color : undefined }}>
                        {form.new_password ? pwStrength.label : t('profile.password_undefined')}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${form.new_password ? pwStrength.score : 0}%`, backgroundColor: pwStrength.color }}
                      />
                    </div>
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                      <li className={pwChecks.minLength ? 'text-success' : 'text-neutral-400'}>
                        {pwChecks.minLength ? '✓' : '•'} {t('profile.req_length')}
                      </li>
                      <li className={pwChecks.hasUpper ? 'text-success' : 'text-neutral-400'}>
                        {pwChecks.hasUpper ? '✓' : '•'} {t('profile.req_uppercase')}
                      </li>
                      <li className={pwChecks.hasNumber ? 'text-success' : 'text-neutral-400'}>
                        {pwChecks.hasNumber ? '✓' : '•'} {t('profile.req_number')}
                      </li>
                      <li className={pwChecks.hasSymbol ? 'text-success' : 'text-neutral-400'}>
                        {pwChecks.hasSymbol ? '✓' : '•'} {t('profile.req_symbol')}
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="confirm_password" className="app-label">{t('profile.field_confirm_password')}</label>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    className={`app-control [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_white] ${errors.confirm_password ? 'border-warning' : ''}`}
                    value={form.confirm_password}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  {errors.confirm_password && <p className="mt-1 text-xs tone-negative">{errors.confirm_password}</p>}
                  {form.confirm_password.length > 0 && (
                    <p className={`text-xs mt-1 ${confirmMatch ? 'text-success' : 'text-neutral-400'}`}>
                      {confirmMatch ? t('profile.confirm_match') : t('profile.confirm_mismatch')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(false)
                    setForm((f) => ({ ...f, current_password: '', new_password: '', confirm_password: '' }))
                    setErrors((current) => ({ ...current, current_password: undefined, new_password: undefined, confirm_password: undefined }))
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-brand-light border border-brand-light text-brand-text hover:bg-brand hover:border-brand hover:text-white text-sm font-medium rounded-lg h-10 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t('profile.cancel_password_change')}
                </button>
              </>
            )}
          </div>

          {/* Footer con botón */}
          <div className="border-t border-neutral-100 px-6 py-4 bg-neutral-50 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-brand hover:bg-brand-hover text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? t('profile.submitting') : t('profile.submit')}
            </button>
          </div>
        </form>

      </div>
    </main>
  )
}
