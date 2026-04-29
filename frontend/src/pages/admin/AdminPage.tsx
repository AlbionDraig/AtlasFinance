import { useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { countriesApi, type Country } from '@/api/countries'
import CategoriesPage from '@/pages/categories/CategoriesPage'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import BanksTab from './components/BanksTab'
import InvestmentEntitiesTab from './components/InvestmentEntitiesTab'
import CountriesTab from './components/CountriesTab'

type AdminTab = 'banks' | 'investment-entities' | 'countries' | 'categories'

function normalizeTab(value: string | null): AdminTab {
  if (value === 'banks' || value === 'investment-entities' || value === 'countries' || value === 'categories') {
    return value
  }

  return 'banks'
}

export default function AdminPage() {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const legacyTab = searchParams.get('tab')

  if (legacyTab === 'management' || legacyTab === 'users' || legacyTab === 'general') {
    return <Navigate to="/management" replace />
  }

  const [activeTab, setActiveTab] = useState<AdminTab>(() => normalizeTab(searchParams.get('tab')))
  const [countries, setCountries] = useState<Country[]>([])

  useEffect(() => {
    async function loadCountriesCatalog() {
      try {
        const response = await countriesApi.list()
        setCountries(response.data)
      } catch (error) {
        toast(getApiErrorMessage(error, t('admin.error_load_countries')), 'error')
      }
    }

    void loadCountriesCatalog()
  }, [])

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

  const countryCatalogOptions = useMemo(() => {
    return [...countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((country) => ({
        value: country.code,
        label: `${country.code} - ${country.name}`,
      }))
  }, [countries])

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">{t('admin.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">{t('admin.subtitle')}</p>
      </div>

      <div className="app-card p-2">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('banks')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'banks' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            {t('admin.banks.tab')}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('investment-entities')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'investment-entities' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            {t('admin.entities.tab')}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('countries')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'countries' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            {t('admin.countries.tab')}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('categories')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'categories' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            {t('admin.categories.tab')}
          </button>
        </div>
      </div>

      {activeTab === 'banks' && <BanksTab countryCatalogOptions={countryCatalogOptions} />}
      {activeTab === 'investment-entities' && <InvestmentEntitiesTab countryCatalogOptions={countryCatalogOptions} />}
      {activeTab === 'countries' && <CountriesTab onCountriesChange={setCountries} />}
      {activeTab === 'categories' && <CategoriesPage embedded />}
    </div>
  )
}
