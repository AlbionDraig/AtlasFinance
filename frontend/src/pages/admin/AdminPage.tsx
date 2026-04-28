import { useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { Navigate, useSearchParams } from 'react-router-dom'
import { banksApi, type Bank } from '@/api/banks'
import { countriesApi, type Country } from '@/api/countries'
import {
  investmentEntitiesApi,
  INVESTMENT_ENTITY_TYPE_OPTIONS,
  type InvestmentEntity,
  type InvestmentEntityType,
} from '@/api/investmentEntities'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CategoriesPage from '@/pages/categories/CategoriesPage'
import { useToast } from '@/hooks/useToast'
import BankCreateModal from './components/BankCreateModal'
import BankEditModal from './components/BankEditModal'
import BanksFiltersCard, { type BanksFiltersState } from './components/BanksFiltersCard'
import BanksTableCard from './components/BanksTableCard'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import CountriesFiltersCard, { type CountriesFiltersState } from './components/CountriesFiltersCard'
import CountriesTableCard from './components/CountriesTableCard'
import CountryCreateModal from './components/CountryCreateModal'
import CountryEditModal from './components/CountryEditModal'
import InvestmentEntitiesFiltersCard, { type InvestmentEntitiesFiltersState } from './components/InvestmentEntitiesFiltersCard'
import InvestmentEntitiesTableCard from './components/InvestmentEntitiesTableCard'
import InvestmentEntityCreateModal from './components/InvestmentEntityCreateModal'
import InvestmentEntityEditModal from './components/InvestmentEntityEditModal'

type AdminTab = 'banks' | 'investment-entities' | 'countries' | 'categories'

function normalizeTab(value: string | null): AdminTab {
  if (value === 'banks' || value === 'investment-entities' || value === 'countries' || value === 'categories') {
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

function buildDefaultCountryFilters(): CountriesFiltersState {
  return {
    query: '',
    pageSize: 10,
  }
}

function buildDefaultInvestmentEntityFilters(): InvestmentEntitiesFiltersState {
  return {
    query: '',
    countryCode: 'all',
    entityType: 'all',
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
  const [loadingInvestmentEntities, setLoadingInvestmentEntities] = useState(true)
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [savingBank, setSavingBank] = useState(false)
  const [savingInvestmentEntity, setSavingInvestmentEntity] = useState(false)
  const [savingCountry, setSavingCountry] = useState(false)
  const [banks, setBanks] = useState<Bank[]>([])
  const [investmentEntities, setInvestmentEntities] = useState<InvestmentEntity[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [bankName, setBankName] = useState('')
  const [bankCountryCode, setBankCountryCode] = useState('')
  const [bankCreateOpen, setBankCreateOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<Bank | null>(null)
  const [deletingBank, setDeletingBank] = useState<Bank | null>(null)
  const [investmentEntityName, setInvestmentEntityName] = useState('')
  const [investmentEntityType, setInvestmentEntityType] = useState<InvestmentEntityType>('broker')
  const [investmentEntityCountryCode, setInvestmentEntityCountryCode] = useState('')
  const [investmentEntityCreateOpen, setInvestmentEntityCreateOpen] = useState(false)
  const [editingInvestmentEntity, setEditingInvestmentEntity] = useState<InvestmentEntity | null>(null)
  const [deletingInvestmentEntity, setDeletingInvestmentEntity] = useState<InvestmentEntity | null>(null)
  const [countryCreateOpen, setCountryCreateOpen] = useState(false)
  const [editingCountry, setEditingCountry] = useState<Country | null>(null)
  const [deletingCountry, setDeletingCountry] = useState<Country | null>(null)
  const [bankPage, setBankPage] = useState(1)
  const [investmentEntityPage, setInvestmentEntityPage] = useState(1)
  const [countryPage, setCountryPage] = useState(1)
  const [bankFilters, setBankFilters] = useState<BanksFiltersState>(() => buildDefaultBankFilters())
  const [investmentEntityFilters, setInvestmentEntityFilters] = useState<InvestmentEntitiesFiltersState>(() => buildDefaultInvestmentEntityFilters())
  const [countryFilters, setCountryFilters] = useState<CountriesFiltersState>(() => buildDefaultCountryFilters())

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
    async function loadInvestmentEntities() {
      setLoadingInvestmentEntities(true)
      try {
        const response = await investmentEntitiesApi.list()
        setInvestmentEntities(response.data)
      } catch (error) {
        toast(getApiErrorMessage(error, 'No se pudieron cargar las entidades de inversión.'), 'error')
      } finally {
        setLoadingInvestmentEntities(false)
      }
    }

    void loadInvestmentEntities()
  }, [])

  useEffect(() => {
    async function loadCountries() {
      setLoadingCountries(true)
      try {
        const response = await countriesApi.list()
        setCountries(response.data)
      } catch (error) {
        toast(getApiErrorMessage(error, 'No se pudieron cargar los países.'), 'error')
      } finally {
        setLoadingCountries(false)
      }
    }

    void loadCountries()
  }, [])

  useEffect(() => {
    setBankPage(1)
  }, [bankFilters.countryCode, bankFilters.pageSize, bankFilters.query])

  useEffect(() => {
    setCountryPage(1)
  }, [countryFilters.pageSize, countryFilters.query])

  useEffect(() => {
    setInvestmentEntityPage(1)
  }, [investmentEntityFilters.countryCode, investmentEntityFilters.entityType, investmentEntityFilters.pageSize, investmentEntityFilters.query])

  const countryOptions = useMemo(() => {
    const values = Array.from(new Set(banks.map((bank) => bank.country_code))).sort()
    return [
      { value: 'all', label: 'Todos' },
      ...values.map((value) => ({ value, label: value })),
    ]
  }, [banks])

  const countryCatalogOptions = useMemo(() => {
    return [...countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((country) => ({
        value: country.code,
        label: `${country.code} - ${country.name}`,
      }))
  }, [countries])

  const investmentEntityCountryOptions = useMemo(() => {
    const values = Array.from(new Set(investmentEntities.map((entity) => entity.country_code))).sort()
    return [
      { value: 'all', label: 'Todos' },
      ...values.map((value) => ({ value, label: value })),
    ]
  }, [investmentEntities])

  const investmentEntityTypeOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Todos' },
      ...INVESTMENT_ENTITY_TYPE_OPTIONS,
    ]
  }, [])

  const investmentEntityTypeLabelByValue = useMemo(
    () => Object.fromEntries(INVESTMENT_ENTITY_TYPE_OPTIONS.map((option) => [option.value, option.label])),
    [],
  )

  useEffect(() => {
    if (!countryCatalogOptions.length) {
      setBankCountryCode('')
      return
    }
    const selectedStillValid = countryCatalogOptions.some((option) => option.value === bankCountryCode)
    if (!selectedStillValid) {
      setBankCountryCode(countryCatalogOptions[0].value)
    }
  }, [countryCatalogOptions, bankCountryCode])

  useEffect(() => {
    if (!countryCatalogOptions.length) {
      setInvestmentEntityCountryCode('')
      return
    }
    const selectedStillValid = countryCatalogOptions.some((option) => option.value === investmentEntityCountryCode)
    if (!selectedStillValid) {
      setInvestmentEntityCountryCode(countryCatalogOptions[0].value)
    }
  }, [countryCatalogOptions, investmentEntityCountryCode])

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

  const filteredInvestmentEntities = useMemo(() => {
    return [...investmentEntities]
      .filter((entity) => {
        const query = investmentEntityFilters.query.trim().toLowerCase()
        if (query) {
          const haystack = `${entity.name} ${entity.country_code}`.toLowerCase()
          if (!haystack.includes(query)) return false
        }
        if (investmentEntityFilters.countryCode !== 'all' && entity.country_code !== investmentEntityFilters.countryCode) {
          return false
        }
        if (investmentEntityFilters.entityType !== 'all' && entity.entity_type !== investmentEntityFilters.entityType) {
          return false
        }
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [investmentEntityFilters.countryCode, investmentEntityFilters.entityType, investmentEntityFilters.query, investmentEntities])

  const totalInvestmentEntityPages = Math.max(1, Math.ceil(filteredInvestmentEntities.length / investmentEntityFilters.pageSize))
  const currentInvestmentEntityPage = Math.min(investmentEntityPage, totalInvestmentEntityPages)
  const investmentEntityStartIndex = (currentInvestmentEntityPage - 1) * investmentEntityFilters.pageSize
  const investmentEntityEndIndex = Math.min(
    investmentEntityStartIndex + investmentEntityFilters.pageSize,
    filteredInvestmentEntities.length,
  )
  const paginatedInvestmentEntities = filteredInvestmentEntities.slice(investmentEntityStartIndex, investmentEntityEndIndex)
  const activeInvestmentEntityFilters = [
    investmentEntityFilters.query.trim() ? `Búsqueda: ${investmentEntityFilters.query.trim()}` : null,
    investmentEntityFilters.entityType !== 'all'
      ? `Tipo: ${investmentEntityTypeLabelByValue[investmentEntityFilters.entityType] ?? investmentEntityFilters.entityType}`
      : null,
    investmentEntityFilters.countryCode !== 'all' ? `País: ${investmentEntityFilters.countryCode}` : null,
  ].filter(Boolean) as string[]

  const filteredCountries = useMemo(() => {
    const query = countryFilters.query.trim().toLowerCase()

    return [...countries]
      .filter((country) => {
        if (!query) return true
        const haystack = `${country.name} ${country.code}`.toLowerCase()
        return haystack.includes(query)
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [countries, countryFilters.query])

  const totalCountryPages = Math.max(1, Math.ceil(filteredCountries.length / countryFilters.pageSize))
  const currentCountryPage = Math.min(countryPage, totalCountryPages)
  const countryStartIndex = (currentCountryPage - 1) * countryFilters.pageSize
  const countryEndIndex = Math.min(countryStartIndex + countryFilters.pageSize, filteredCountries.length)
  const paginatedCountries = filteredCountries.slice(countryStartIndex, countryEndIndex)
  const activeCountryFilters = [
    countryFilters.query.trim() ? `Búsqueda: ${countryFilters.query.trim()}` : null,
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
    if (!bankCountryCode) {
      toast('Debes crear y seleccionar un país antes de crear bancos.', 'error')
      return
    }

    setSavingBank(true)
    try {
      const response = await banksApi.create({ name: bankName.trim(), country_code: bankCountryCode })
      setBanks((current) => [response.data, ...current])
      setBankName('')
      setBankCountryCode(countryCatalogOptions[0]?.value ?? '')
      setBankCreateOpen(false)
      toast('Banco creado con éxito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo crear el banco.'), 'error')
    } finally {
      setSavingBank(false)
    }
  }

  async function handleEditBank(id: number, name: string, countryCode: string) {
    setSavingBank(true)
    try {
      const response = await banksApi.update(id, { name, country_code: countryCode })
      setBanks((current) => current.map((b) => (b.id === id ? response.data : b)))
      setEditingBank(null)
      toast('Banco actualizado con éxito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo actualizar el banco.'), 'error')
    } finally {
      setSavingBank(false)
    }
  }

  async function handleDeleteBank() {
    if (!deletingBank) return
    setSavingBank(true)
    try {
      await banksApi.delete(deletingBank.id)
      setBanks((current) => current.filter((b) => b.id !== deletingBank.id))
      setDeletingBank(null)
      toast('Banco eliminado.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo eliminar el banco.'), 'error')
    } finally {
      setSavingBank(false)
    }
  }

  async function handleCreateInvestmentEntity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (investmentEntityName.trim().length < 2) {
      toast('El nombre de la entidad debe tener al menos 2 caracteres.', 'error')
      return
    }
    if (!investmentEntityCountryCode) {
      toast('Debes crear y seleccionar un país antes de crear entidades.', 'error')
      return
    }

    setSavingInvestmentEntity(true)
    try {
      const response = await investmentEntitiesApi.create({
        name: investmentEntityName.trim(),
        entity_type: investmentEntityType,
        country_code: investmentEntityCountryCode,
      })
      setInvestmentEntities((current) => [response.data, ...current])
      setInvestmentEntityName('')
      setInvestmentEntityType('broker')
      setInvestmentEntityCountryCode(countryCatalogOptions[0]?.value ?? '')
      setInvestmentEntityCreateOpen(false)
      toast('Entidad de inversión creada con éxito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo crear la entidad de inversión.'), 'error')
    } finally {
      setSavingInvestmentEntity(false)
    }
  }

  async function handleEditInvestmentEntity(
    id: number,
    data: { name: string; entity_type: InvestmentEntityType; country_code: string },
  ) {
    setSavingInvestmentEntity(true)
    try {
      const response = await investmentEntitiesApi.update(id, data)
      setInvestmentEntities((current) => current.map((entity) => (entity.id === id ? response.data : entity)))
      setEditingInvestmentEntity(null)
      toast('Entidad de inversión actualizada con éxito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo actualizar la entidad de inversión.'), 'error')
    } finally {
      setSavingInvestmentEntity(false)
    }
  }

  async function handleDeleteInvestmentEntity() {
    if (!deletingInvestmentEntity) return
    setSavingInvestmentEntity(true)
    try {
      await investmentEntitiesApi.delete(deletingInvestmentEntity.id)
      setInvestmentEntities((current) => current.filter((entity) => entity.id !== deletingInvestmentEntity.id))
      setDeletingInvestmentEntity(null)
      toast('Entidad de inversión eliminada.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo eliminar la entidad de inversión.'), 'error')
    } finally {
      setSavingInvestmentEntity(false)
    }
  }

  async function handleCreateCountry(name: string, code: string) {
    setSavingCountry(true)
    try {
      const response = await countriesApi.create({ name, code })
      setCountries((current) => [response.data, ...current])
      setCountryCreateOpen(false)
      toast('País creado con éxito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo crear el país.'), 'error')
    } finally {
      setSavingCountry(false)
    }
  }

  async function handleEditCountry(id: number, name: string, code: string) {
    setSavingCountry(true)
    try {
      const response = await countriesApi.update(id, { name, code })
      setCountries((current) => current.map((country) => (country.id === id ? response.data : country)))
      setEditingCountry(null)
      toast('País actualizado con éxito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo actualizar el país.'), 'error')
    } finally {
      setSavingCountry(false)
    }
  }

  async function handleDeleteCountry() {
    if (!deletingCountry) return
    setSavingCountry(true)
    try {
      await countriesApi.delete(deletingCountry.id)
      setCountries((current) => current.filter((country) => country.id !== deletingCountry.id))
      setDeletingCountry(null)
      toast('País eliminado.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo eliminar el país.'), 'error')
    } finally {
      setSavingCountry(false)
    }
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">Administración</h1>
        <p className="app-subtitle text-sm mt-0.5">Administra los catálogos base del sistema, como bancos, entidades de inversión, países y categorías.</p>
      </div>

      <div className="app-card p-2">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('banks')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'banks' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            Bancos
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('investment-entities')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'investment-entities' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            Entidades inversión
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('countries')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'countries' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            Países
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
              countryCode={bankCountryCode}
              countryOptions={countryCatalogOptions}
              setName={setBankName}
              setCountryCode={setBankCountryCode}
              saving={savingBank}
              onSubmit={handleCreateBank}
              onClose={() => {
                setBankCreateOpen(false)
                setBankName('')
                setBankCountryCode(countryCatalogOptions[0]?.value ?? '')
              }}
            />
          )}

          {editingBank && (
            <BankEditModal
              bank={editingBank}
              countryOptions={countryCatalogOptions}
              saving={savingBank}
              onSubmit={handleEditBank}
              onClose={() => setEditingBank(null)}
            />
          )}

          {deletingBank && (
            <ConfirmDeleteModal
              title="Eliminar banco"
              description={`¿Eliminar "${deletingBank.name}"? Las cuentas asociadas perderán la referencia al banco.`}
              loading={savingBank}
              onConfirm={handleDeleteBank}
              onClose={() => setDeletingBank(null)}
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
              onEdit={setEditingBank}
              onDelete={setDeletingBank}
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
                  if (!countryCatalogOptions.length) {
                    toast('Crea al menos un país para poder registrar bancos.', 'error')
                    return
                  }
                  setBankName('')
                  setBankCountryCode(countryCatalogOptions[0]?.value ?? '')
                  setBankCreateOpen(true)
                },
              },
            ]}
          />
        </>
      )}

      {activeTab === 'investment-entities' && (
        <>
          {investmentEntityCreateOpen && (
            <InvestmentEntityCreateModal
              name={investmentEntityName}
              entityType={investmentEntityType}
              countryCode={investmentEntityCountryCode}
              countryOptions={countryCatalogOptions}
              typeOptions={INVESTMENT_ENTITY_TYPE_OPTIONS}
              setName={setInvestmentEntityName}
              setEntityType={setInvestmentEntityType}
              setCountryCode={setInvestmentEntityCountryCode}
              saving={savingInvestmentEntity}
              onSubmit={handleCreateInvestmentEntity}
              onClose={() => {
                setInvestmentEntityCreateOpen(false)
                setInvestmentEntityName('')
                setInvestmentEntityType('broker')
                setInvestmentEntityCountryCode(countryCatalogOptions[0]?.value ?? '')
              }}
            />
          )}

          {editingInvestmentEntity && (
            <InvestmentEntityEditModal
              entity={editingInvestmentEntity}
              countryOptions={countryCatalogOptions}
              typeOptions={INVESTMENT_ENTITY_TYPE_OPTIONS}
              saving={savingInvestmentEntity}
              onSubmit={handleEditInvestmentEntity}
              onClose={() => setEditingInvestmentEntity(null)}
            />
          )}

          {deletingInvestmentEntity && (
            <ConfirmDeleteModal
              title="Eliminar entidad de inversión"
              description={`¿Eliminar "${deletingInvestmentEntity.name}"? Las inversiones asociadas también se eliminarán.`}
              loading={savingInvestmentEntity}
              onConfirm={handleDeleteInvestmentEntity}
              onClose={() => setDeletingInvestmentEntity(null)}
            />
          )}

          <InvestmentEntitiesFiltersCard
            filters={investmentEntityFilters}
            setFilters={setInvestmentEntityFilters}
            activeFilters={activeInvestmentEntityFilters}
            countryOptions={investmentEntityCountryOptions}
            entityTypeOptions={investmentEntityTypeOptions}
            onResetFilters={() => setInvestmentEntityFilters(buildDefaultInvestmentEntityFilters())}
          />

          {loadingInvestmentEntities ? (
            <section className="app-card p-6">
              <LoadingSpinner text="Cargando entidades de inversión..." />
            </section>
          ) : (
            <InvestmentEntitiesTableCard
              filteredEntities={filteredInvestmentEntities}
              paginatedEntities={paginatedInvestmentEntities}
              currentPage={currentInvestmentEntityPage}
              totalPages={totalInvestmentEntityPages}
              startIndex={investmentEntityStartIndex}
              endIndex={investmentEntityEndIndex}
              pageSize={investmentEntityFilters.pageSize}
              typeLabelByValue={investmentEntityTypeLabelByValue}
              onPrevPage={() => setInvestmentEntityPage((current) => Math.max(1, current - 1))}
              onNextPage={() => setInvestmentEntityPage((current) => Math.min(totalInvestmentEntityPages, current + 1))}
              onPageSizeChange={(size) => setInvestmentEntityFilters((current) => ({ ...current, pageSize: size }))}
              onEdit={setEditingInvestmentEntity}
              onDelete={setDeletingInvestmentEntity}
            />
          )}

          <FloatingActionMenu
            hidden={false}
            ariaLabel="Abrir acciones de entidades de inversión"
            items={[
              {
                key: 'create-investment-entity',
                label: 'Crear entidad inversión',
                onClick: () => {
                  if (!countryCatalogOptions.length) {
                    toast('Crea al menos un país para poder registrar entidades.', 'error')
                    return
                  }
                  setInvestmentEntityName('')
                  setInvestmentEntityType('broker')
                  setInvestmentEntityCountryCode(countryCatalogOptions[0]?.value ?? '')
                  setInvestmentEntityCreateOpen(true)
                },
              },
            ]}
          />
        </>
      )}

      {activeTab === 'countries' && (
        <>
          {countryCreateOpen && (
            <CountryCreateModal
              saving={savingCountry}
              onSubmit={handleCreateCountry}
              onClose={() => setCountryCreateOpen(false)}
            />
          )}

          {editingCountry && (
            <CountryEditModal
              country={editingCountry}
              saving={savingCountry}
              onSubmit={handleEditCountry}
              onClose={() => setEditingCountry(null)}
            />
          )}

          {deletingCountry && (
            <ConfirmDeleteModal
              title="Eliminar país"
              description={`¿Eliminar "${deletingCountry.name}"? Esta acción no se puede deshacer.`}
              loading={savingCountry}
              onConfirm={handleDeleteCountry}
              onClose={() => setDeletingCountry(null)}
            />
          )}

          <CountriesFiltersCard
            filters={countryFilters}
            setFilters={setCountryFilters}
            activeFilters={activeCountryFilters}
            onResetFilters={() => setCountryFilters(buildDefaultCountryFilters())}
          />

          {loadingCountries ? (
            <section className="app-card p-6">
              <LoadingSpinner text="Cargando países..." />
            </section>
          ) : (
            <CountriesTableCard
              filteredCountries={filteredCountries}
              paginatedCountries={paginatedCountries}
              currentPage={currentCountryPage}
              totalPages={totalCountryPages}
              startIndex={countryStartIndex}
              endIndex={countryEndIndex}
              pageSize={countryFilters.pageSize}
              onPrevPage={() => setCountryPage((current) => Math.max(1, current - 1))}
              onNextPage={() => setCountryPage((current) => Math.min(totalCountryPages, current + 1))}
              onPageSizeChange={(size) => setCountryFilters((current) => ({ ...current, pageSize: size }))}
              onEdit={setEditingCountry}
              onDelete={setDeletingCountry}
            />
          )}

          <FloatingActionMenu
            hidden={false}
            ariaLabel="Abrir acciones de países"
            items={[
              {
                key: 'create-country',
                label: 'Crear país',
                onClick: () => setCountryCreateOpen(true),
              },
            ]}
          />
        </>
      )}

    </div>
  )
}
