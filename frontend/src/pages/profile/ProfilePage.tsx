import { useEffect, useState } from 'react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/useToast'

interface FormState {
  full_name: string
  email: string
  current_password: string
  new_password: string
  confirm_password: string
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const { toast } = useToast()

  const [form, setForm] = useState<FormState>({
    full_name: user?.full_name ?? '',
    email: user?.email ?? '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [loading, setLoading] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, full_name: user.full_name, email: user.email }))
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.full_name.trim().length < 2) {
      toast('El nombre debe tener al menos 2 caracteres.', 'error')
      return
    }
    if (!form.email.trim()) {
      toast('El correo es obligatorio.', 'error')
      return
    }

    if (changingPassword) {
      if (!form.current_password) {
        toast('Ingresa tu contraseña actual para cambiarla.', 'error')
        return
      }
      if (form.new_password.length < 8) {
        toast('La nueva contraseña debe tener al menos 8 caracteres.', 'error')
        return
      }
      if (form.new_password !== form.confirm_password) {
        toast('Las contraseñas nuevas no coinciden.', 'error')
        return
      }
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
      toast('Perfil actualizado correctamente.', 'success')
      setForm((f) => ({ ...f, current_password: '', new_password: '', confirm_password: '' }))
      setChangingPassword(false)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response?.status
      const rawDetail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      const detail = typeof rawDetail === 'string' ? rawDetail : undefined

      if (status === 400) {
        if (detail?.includes('already in use') || detail?.includes('already registered')) {
          toast('Ese correo ya está en uso por otra cuenta.', 'error')
        } else if (detail?.includes('Incorrect current password')) {
          toast('La contraseña actual es incorrecta.', 'error')
        } else if (detail?.includes('current_password is required')) {
          toast('Debes ingresar tu contraseña actual para cambiarla.', 'error')
        } else {
          toast(detail ?? 'No se pudieron guardar los cambios.', 'error')
        }
      } else if (status && status >= 500) {
        toast('El servidor no respondió correctamente. Intenta más tarde.', 'error')
      } else if (!status) {
        toast('No se pudo conectar al servidor.', 'error')
      } else {
        toast('No se pudieron guardar los cambios.', 'error')
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
      <div className="max-w-xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-xl font-medium text-neutral-900">Mi perfil</h1>
          <p className="text-sm text-neutral-700 mt-1">Edita tu nombre, correo o contraseña.</p>
        </div>

        {/* Avatar + name card */}
        <div className="bg-white border border-neutral-100 rounded-xl px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center shrink-0">
            <span className="text-xl font-medium text-brand-text">{initials}</span>
          </div>
          <div>
            <p className="text-base font-medium text-neutral-900">{user?.full_name}</p>
            <p className="text-sm text-neutral-400">{user?.email}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-neutral-100 rounded-xl px-6 py-6 space-y-5">
          <p className="text-xs font-medium tracking-widest uppercase text-neutral-700">Información personal</p>

          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label htmlFor="full_name" className="app-label">Nombre completo</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              className="app-control"
              value={form.full_name}
              onChange={handleChange}
              autoComplete="name"
            />
          </div>

          {/* Correo */}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="app-label">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              className="app-control"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          {/* Cambiar contraseña toggle */}
          <div className="pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setChangingPassword((v) => !v)}
              className="text-sm font-medium text-brand hover:text-brand-hover transition-colors"
            >
              {changingPassword ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
            </button>
          </div>

          {changingPassword && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="current_password" className="app-label">Contraseña actual</label>
                <input
                  id="current_password"
                  name="current_password"
                  type="password"
                  className="app-control"
                  value={form.current_password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="new_password" className="app-label">Nueva contraseña</label>
                <input
                  id="new_password"
                  name="new_password"
                  type="password"
                  className="app-control"
                  value={form.new_password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="confirm_password" className="app-label">Confirmar nueva contraseña</label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  className="app-control"
                  value={form.confirm_password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="app-btn-primary w-full disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>

      </div>
    </main>
  )
}
