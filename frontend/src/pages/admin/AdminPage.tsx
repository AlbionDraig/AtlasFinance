import { useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { Navigate, useSearchParams } from 'react-router-dom'
import { banksApi, type Bank } from '@/api/banks'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CategoriesPage from '@/pages/categories/CategoriesPage'
import { useToast } from '@/hooks/useToast'
import BankCreateModal from './components/BankCreateModal'
import BanksFiltersCard, { type BanksFiltersState } from './components/BanksFiltersCard'
import BanksTableCard from './components/BanksTableCard'

type AdminTab = 'banks' | 'categories'

function normalizeTab(value: string | null): AdminTab {
  if (value === 'banks' || value === 'categories') {
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

function buildDefaultBankFilters(): BanksFiltersState {
  return {
    query: '',
    countryCode: 'all',
    pageSize: 10,
  }
}

export default function AdminPage() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const legacyTab = searchParams.get('tab')

  if (legacyTab === 'management' || legacyTab === 'users' || legacyTab === 'general') {
    return <Navigate to="/management" replace />
  }

  const [activeTab, setActiveTab] = useState<AdminTab>(() => normalizeTab(searchParams.get('tab')))
  const [loadingBanks, setLoadingBanks] = useState(true)
  const [savingBank, setSavingBank] = useState(false)
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankName, setBankName] = useState('')
  const [bankCreateOpen, setBankCreateOpen] = useState(false)
  const [bankPage, setBankPage] = useState(1)
  const [bankFilters, setBankFilters] = useState<BanksFiltersState>(() => buildDefaultBankFilters())

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

  useEffect(() => {
    setBankPage(1)
  }, [bankFilters.countryCode, bankFilters.pageSize, bankFilters.query])

  const countryOptions = useMemo(() => {
    const values = Array.from(new Set(banks.map((bank) => bank.country_code))).sort()
    return [
      { value: 'all', label: 'Todos' },
      ...values.map((value) => ({ value, label: value })),
    ]
  }, [banks])

  const filteredBanks = useMemo(() => {
    return [...banks]
      .filter((bank) => {
        const query = bankFilters.query.trim().toLowerCase()
        if (query) {
          const haystack = `${bank.name} ${bank.country_code}`.toLowerCase()
          if (!haystack.includes(query)) return false
        }
        if (bankFilters.countryCode !== 'all' && bank.country_code !== bankFilters.countryCode) {
          return false
        }
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [bankFilters.countryCode, bankFilters.query, banks])

  const totalBankPages = Math.max(1, Math.ceil(filteredBanks.length / bankFilters.pageSize))
  const currentBankPage = Math.min(bankPage, totalBankPages)
  const bankStartIndex = (currentBankPage - 1) * bankFilters.pageSize
  const bankEndIndex = Math.min(bankStartIndex + bankFilters.pageSize, filteredBanks.length)
  const paginatedBanks = filteredBanks.slice(bankStartIndex, bankEndIndex)
  const activeBankFilters = [
    bankFilters.query.trim() ? `Búsqueda: ${bankFilters.query.trim()}` : null,
    bankFilters.countryCode !== 'all' ? `País: ${bankFilters.countryCode}` : null,
  ].filter(Boolean) as string[]

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
      setBankCreateOpen(false)
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
        </div>
      </div>

      {activeTab === 'categories' && (
        <CategoriesPage embedded />
      )}

      {activeTab === 'banks' && (
        <>
          {bankCreateOpen && (
            <BankCreateModal
              name={bankName}
              setName={setBankName}
              saving={savingBank}
              onSubmit={handleCreateBank}
              onClose={() => {
                setBankCreateOpen(false)
                setBankName('')
              }}
            />
          )}

          <BanksFiltersCard
            filters={bankFilters}
            setFilters={setBankFilters}
            activeFilters={activeBankFilters}
            countryOptions={countryOptions}
            onResetFilters={() => setBankFilters(buildDefaultBankFilters())}
          />

          {loadingBanks ? (
            <section className="app-card p-6">
              <LoadingSpinner text="Cargando bancos..." />
            </section>
          ) : (
            <BanksTableCard
              filteredBanks={filteredBanks}
              paginatedBanks={paginatedBanks}
              currentPage={currentBankPage}
              totalPages={totalBankPages}
              startIndex={bankStartIndex}
              endIndex={bankEndIndex}
              pageSize={bankFilters.pageSize}
              onPrevPage={() => setBankPage((current) => Math.max(1, current - 1))}
              onNextPage={() => setBankPage((current) => Math.min(totalBankPages, current + 1))}
              onPageSizeChange={(size) => setBankFilters((current) => ({ ...current, pageSize: size }))}
            />
          )}

          <FloatingActionMenu
            hidden={false}
            ariaLabel="Abrir acciones de bancos"
            items={[
              {
                key: 'create-bank',
                label: 'Crear banco',
                onClick: () => {
                  setBankName('')
                  setBankCreateOpen(true)
                },
              },
            ]}
          />
        </>
      )}

    </div>
  )
}
