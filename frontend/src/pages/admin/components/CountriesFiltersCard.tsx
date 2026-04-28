import type { Dispatch, SetStateAction } from 'react'
import FilterCard from '@/components/ui/FilterCard'
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
  return (
    <FilterCard sticky activeFilters={activeFilters} onReset={onResetFilters}>
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <label className="app-label">Buscar</label>
        <SearchInput
          value={filters.query}
          onChange={(value) => setFilters((current) => ({ ...current, query: value }))}
          placeholder="Nombre o código"
        />
      </div>
    </FilterCard>
  )
}