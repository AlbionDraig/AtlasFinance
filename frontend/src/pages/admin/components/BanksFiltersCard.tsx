import type { Dispatch, SetStateAction } from 'react'
import FilterCard from '@/components/ui/FilterCard'
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
  return (
    <FilterCard sticky activeFilters={activeFilters} onReset={onResetFilters}>
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <label className="app-label">Buscar</label>
        <SearchInput
          value={filters.query}
          onChange={(value) => setFilters((current) => ({ ...current, query: value }))}
          placeholder="Banco o código país"
        />
      </div>

      <div className="flex w-36 flex-col gap-1">
        <label className="app-label">País</label>
        <Select
          value={filters.countryCode}
          onChange={(value) => setFilters((current) => ({ ...current, countryCode: value }))}
          options={countryOptions}
          className="w-full"
          active={filters.countryCode !== 'all'}
        />
      </div>
    </FilterCard>
  )
}
