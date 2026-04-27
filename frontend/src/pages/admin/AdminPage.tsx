import { useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { useSearchParams } from 'react-router-dom'
import { banksApi, type Bank } from '@/api/banks'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CategoriesPage from '@/pages/categories/CategoriesPage'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/store/authStore'

type AdminTab = 'banks' | 'categories' | 'users' | 'general'

function normalizeTab(value: string | null): AdminTab {
  if (value === 'banks' || value === 'categories' || value === 'users' || value === 'general') {
    return value
  }
  return 'banks'
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return fallback
}

export default function AdminPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<AdminTab>(() => normalizeTab(searchParams.get('tab')))
  const [loadingBanks, setLoadingBanks] = useState(true)
  const [savingBank, setSavingBank] = useState(false)
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankName, setBankName] = useState('')

  useEffect(() => {
    async function loadBanks() {
      setLoadingBanks(true)
      try {
        const response = await banksApi.list()
        setBanks(response.data)
      } catch (error) {
        toast(getApiErrorMessage(error, 'No se pudieron cargar los bancos.'), 'error')
      } finally {
        setLoadingBanks(false)
      }
    }

    void loadBanks()
  }, [])

  const sortedBanks = useMemo(
    () => [...banks].sort((a, b) => a.name.localeCompare(b.name)),
    [banks],
  )

  useEffect(() => {
    const tabFromUrl = normalizeTab(searchParams.get('tab'))
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, activeTab])

  function handleTabChange(tab: AdminTab) {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  async function handleCreateBank(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (bankName.trim().length < 2) {
      toast('El nombre del banco debe tener al menos 2 caracteres.', 'error')
      return
    }

    setSavingBank(true)
    try {
      const response = await banksApi.create({ name: bankName.trim(), country_code: 'CO' })
      setBanks((current) => [response.data, ...current])
      setBankName('')
      toast('Banco creado con éxito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo crear el banco.'), 'error')
    } finally {
      setSavingBank(false)
    }
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">Administración</h1>
        <p className="app-subtitle text-sm mt-0.5">Gestiona catálogos y opciones operativas del sistema.</p>
      </div>

      <div className="app-card p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('banks')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'banks' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            Bancos
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('categories')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'categories' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            Categorías
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('users')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            Usuarios
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('general')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            General
          </button>
        </div>
      </div>

      {activeTab === 'categories' && (
        <CategoriesPage />
      )}

      {activeTab === 'banks' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-6 items-start">
          <section className="app-card p-5 border-t-4 border-t-brand">
            <h2 className="app-section-title text-brand-text">Crear banco</h2>
            <p className="text-sm text-neutral-700 mt-1 mb-4">Agrega bancos disponibles para asociar nuevas cuentas.</p>

            <form onSubmit={handleCreateBank} className="space-y-4">
              <div className="space-y-1">
                <label className="app-label">Nombre del banco</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  className="app-control w-full"
                  placeholder="Ej: Bancolombia"
                />
              </div>
              <div className="space-y-1">
                <label className="app-label">País</label>
                <input
                  type="text"
                  value="CO"
                  readOnly
                  className="app-control w-full bg-neutral-50 text-neutral-700"
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="app-btn-primary" disabled={savingBank}>
                  {savingBank ? 'Guardando...' : 'Crear banco'}
                </button>
              </div>
            </form>
          </section>

          <section className="app-card overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-100 bg-neutral-50 px-6 py-4">
              <div>
                <h2 className="text-sm font-medium text-neutral-900">Bancos registrados</h2>
                <p className="text-xs text-neutral-400">{sortedBanks.length} banco(s)</p>
              </div>
            </div>

            {loadingBanks ? (
              <div className="p-6">
                <LoadingSpinner text="Cargando bancos..." />
              </div>
            ) : !sortedBanks.length ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-neutral-700">Aún no hay bancos registrados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">Banco</th>
                      <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">Código país</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBanks.map((bank) => (
                      <tr key={bank.id} className="odd:bg-white even:bg-neutral-50/50">
                        <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-sm text-neutral-900">{bank.name}</td>
                        <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-sm text-neutral-700">{bank.country_code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'users' && (
        <section className="app-card p-5 border-t-4 border-t-warning">
          <h2 className="app-section-title text-warning-text">Usuarios</h2>
          <p className="text-sm text-neutral-700 mt-1">Módulo preparado. Aquí podrás administrar usuarios cuando habilitemos endpoints de listado y gestión.</p>
          {user && (
            <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              <p className="text-xs font-medium tracking-widest uppercase text-neutral-700">Sesión actual</p>
              <p className="text-sm text-neutral-900 mt-1">{user.full_name}</p>
              <p className="text-xs text-neutral-400">{user.email}</p>
            </div>
          )}
        </section>
      )}

      {activeTab === 'general' && (
        <section className="app-card p-5 border-t-4 border-t-brand-deep">
          <h2 className="app-section-title text-brand-deep">General</h2>
          <p className="text-sm text-neutral-700 mt-1">Espacio listo para configuraciones globales del sistema.</p>
        </section>
      )}
    </div>
  )
}
