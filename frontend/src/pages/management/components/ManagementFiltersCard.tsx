import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import FilterCard from '@/components/ui/FilterCard'
import SearchInput from '@/components/ui/SearchInput'
import Select from '@/components/ui/Select'

export interface ManagementFiltersState {
  query: string
  role: 'all' | 'admin' | 'user'
}

interface ManagementFiltersCardProps {
  filters: ManagementFiltersState
  setFilters: Dispatch<SetStateAction<ManagementFiltersState>>
  activeFilters: string[]
  onResetFilters: () => void
}

export default function ManagementFiltersCard({
  filters,
  setFilters,
  activeFilters,
  onResetFilters,
}: ManagementFiltersCardProps) {
  const { t } = useTranslation()

  return (
    <FilterCard activeFilters={activeFilters} onReset={onResetFilters}>
      <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
        <label className="app-label">{t('common.search')}</label>
        <SearchInput
          value={filters.query}
          onChange={(value) => setFilters((current) => ({ ...current, query: value }))}
          placeholder={t('management.filter_search_placeholder')}
        />
      </div>

      <div className="flex flex-col gap-1 w-44">
        <label className="app-label">{t('management.filter_role_label')}</label>
        <Select
          value={filters.role}
          onChange={(value) => setFilters((current) => ({ ...current, role: value as ManagementFiltersState['role'] }))}
          options={[
            { value: 'all', label: t('management.filter_role_all') },
            { value: 'admin', label: t('management.role_admin') },
            { value: 'user', label: t('management.role_user') },
          ]}
          className="w-full"
          active={filters.role !== 'all'}
        />
      </div>
    </FilterCard>
  )
}
