import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import ResponsiveFilters from '@/components/ui/ResponsiveFilters'
import SearchInput from '@/components/ui/SearchInput'
import Select from '@/components/ui/Select'

export interface BanksFiltersState {
  query: string
  countryCode: string
  pageSize: number
}

interface BanksFiltersCardProps {
  filters: BanksFiltersState
  setFilters: Dispatch<SetStateAction<BanksFiltersState>>
  activeFilters: string[]
  countryOptions: Array<{ value: string; label: string }>
  onResetFilters: () => void
}

export default function BanksFiltersCard({
  filters,
  setFilters,
  activeFilters,
  countryOptions,
  onResetFilters,
}: BanksFiltersCardProps) {
  const { t } = useTranslation()
  return (
    <ResponsiveFilters
      activeFilters={activeFilters}
      onResetFilters={onResetFilters}
      mobileTitle={t('admin.banks.title')}
      stickyDesktop
    >
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <label className="app-label">{t('common.search')}</label>
        <SearchInput
          value={filters.query}
          onChange={(value) => setFilters((current) => ({ ...current, query: value }))}
          placeholder={t('admin.banks.filter_search_placeholder')}
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
