import { useEffect, useMemo, useState } from 'react'
import { countriesApi, type Country } from '@/api/countries'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import CountriesFiltersCard, { type CountriesFiltersState } from './CountriesFiltersCard'
import CountriesTableCard from './CountriesTableCard'
import CountryCreateModal from './CountryCreateModal'
import CountryEditModal from './CountryEditModal'

function buildDefaultCountryFilters(): CountriesFiltersState {
  return {
    query: '',
    pageSize: 10,
  }
}

interface CountriesTabProps {
  onCountriesChange?: (countries: Country[]) => void
}

export default function CountriesTab({ onCountriesChange }: CountriesTabProps) {
  const { toast } = useToast()

  const [loadingCountries, setLoadingCountries] = useState(true)
  const [savingCountry, setSavingCountry] = useState(false)
  const [countries, setCountries] = useState<Country[]>([])
  const [countryCreateOpen, setCountryCreateOpen] = useState(false)
  const [editingCountry, setEditingCountry] = useState<Country | null>(null)
  const [deletingCountry, setDeletingCountry] = useState<Country | null>(null)
  const [countryPage, setCountryPage] = useState(1)
  const [countryFilters, setCountryFilters] = useState<CountriesFiltersState>(() => buildDefaultCountryFilters())

  useEffect(() => {
    async function loadCountries() {
      setLoadingCountries(true)
      try {
        const response = await countriesApi.list()
        setCountries(response.data)
        onCountriesChange?.(response.data)
      } catch (error) {
        toast(getApiErrorMessage(error, 'No se pudieron cargar los paises.'), 'error')
      } finally {
        setLoadingCountries(false)
      }
    }

    void loadCountries()
  }, [onCountriesChange])

  useEffect(() => {
    onCountriesChange?.(countries)
  }, [countries, onCountriesChange])

  useEffect(() => {
    setCountryPage(1)
  }, [countryFilters.pageSize, countryFilters.query])

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
  const activeCountryFilters = [countryFilters.query.trim() ? `Busqueda: ${countryFilters.query.trim()}` : null].filter(Boolean) as string[]

  async function handleCreateCountry(name: string, code: string) {
    setSavingCountry(true)
    try {
      const response = await countriesApi.create({ name, code })
      setCountries((current) => [response.data, ...current])
      setCountryCreateOpen(false)
      toast('Pais creado con exito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo crear el pais.'), 'error')
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
      toast('Pais actualizado con exito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo actualizar el pais.'), 'error')
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
      toast('Pais eliminado.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo eliminar el pais.'), 'error')
    } finally {
      setSavingCountry(false)
    }
  }

  return (
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
          title="Eliminar pais"
          description={`¿Eliminar "${deletingCountry.name}"? Esta accion no se puede deshacer.`}
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
          <LoadingSpinner text="Cargando paises..." />
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
        ariaLabel="Abrir acciones de paises"
        items={[
          {
            key: 'create-country',
            label: 'Crear pais',
            onClick: () => setCountryCreateOpen(true),
          },
        ]}
      />
    </>
  )
}
