import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import ResponsiveFilters from '@/components/ui/ResponsiveFilters'
import SearchInput from '@/components/ui/SearchInput'
import Select from '@/components/ui/Select'

export interface InvestmentEntitiesFiltersState {
  query: string
  countryCode: string
  entityType: string
  pageSize: number
}

interface InvestmentEntitiesFiltersCardProps {
  filters: InvestmentEntitiesFiltersState
  setFilters: Dispatch<SetStateAction<InvestmentEntitiesFiltersState>>
  activeFilters: string[]
  countryOptions: Array<{ value: string; label: string }>
  entityTypeOptions: Array<{ value: string; label: string }>
  onResetFilters: () => void
}

export default function InvestmentEntitiesFiltersCard({
  filters,
  setFilters,
  activeFilters,
  countryOptions,
  entityTypeOptions,
  onResetFilters,
}: InvestmentEntitiesFiltersCardProps) {
  const { t } = useTranslation()
  return (
    <ResponsiveFilters
      activeFilters={activeFilters}
      onResetFilters={onResetFilters}
      mobileTitle={t('admin.entities.title')}
      stickyDesktop
    >
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <label className="app-label">{t('common.search')}</label>
        <SearchInput
          value={filters.query}
          onChange={(value) => setFilters((current) => ({ ...current, query: value }))}
          placeholder={t('admin.entities.filter_search_placeholder')}
        />
      </div>

      <div className="flex w-40 flex-col gap-1">
        <label className="app-label">{t('common.type')}</label>
        <Select
          value={filters.entityType}
          onChange={(value) => setFilters((current) => ({ ...current, entityType: value }))}
          options={entityTypeOptions}
          className="w-full"
          active={filters.entityType !== 'all'}
        />
      </div>

      <div className="flex w-36 flex-col gap-1">
        <label className="app-label">{t('common.country')}</label>
        <Select
          value={filters.countryCode}
          onChange={(value) => setFilters((current) => ({ ...current, countryCode: value }))}
          options={countryOptions}
          className="w-full"
          active={filters.countryCode !== 'all'}
        />
      </div>
    </ResponsiveFilters>
  )
}
