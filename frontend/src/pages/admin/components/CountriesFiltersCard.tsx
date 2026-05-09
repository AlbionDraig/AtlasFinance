import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import ResponsiveFilters from '@/components/ui/ResponsiveFilters'
import SearchInput from '@/components/ui/SearchInput'

export interface CountriesFiltersState {
  query: string
  pageSize: number
}

interface CountriesFiltersCardProps {
  filters: CountriesFiltersState
  setFilters: Dispatch<SetStateAction<CountriesFiltersState>>
  activeFilters: string[]
  onResetFilters: () => void
}

export default function CountriesFiltersCard({
  filters,
  setFilters,
  activeFilters,
  onResetFilters,
}: CountriesFiltersCardProps) {
  const { t } = useTranslation()
  return (
    <ResponsiveFilters
      activeFilters={activeFilters}
      onResetFilters={onResetFilters}
      mobileTitle={t('admin.countries.title')}
      stickyDesktop
    >
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <label className="app-label">{t('common.search')}</label>
        <SearchInput
          value={filters.query}
          onChange={(value) => setFilters((current) => ({ ...current, query: value }))}
          placeholder={t('admin.countries.filter_search_placeholder')}
        />
      </div>
    </ResponsiveFilters>
  )
}