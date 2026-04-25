import type { Dispatch, SetStateAction } from 'react'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
import FilterCard from '@/components/ui/FilterCard'
import SearchInput from '@/components/ui/SearchInput'
import type { Account } from '@/types'
import type { FiltersState, PeriodFilter } from '../types'

interface TransactionsFiltersCardProps {
  filters: FiltersState
  setFilters: Dispatch<SetStateAction<FiltersState>>
  accounts: Account[]
  activeFilters: string[]
  datasetRange: { min: string; max: string }
  derivedRange: { from: string; to: string }
  onResetFilters: () => void
}

export default function TransactionsFiltersCard({
  filters,
  setFilters,
  accounts,
  activeFilters,
  datasetRange,
  derivedRange,
  onResetFilters,
}: TransactionsFiltersCardProps) {
  return (
    <FilterCard sticky activeFilters={activeFilters} onReset={onResetFilters}>
      {/* Buscar */}
      <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
        <label className="app-label">Buscar</label>
        <SearchInput
          value={filters.query}
          onChange={(value) => setFilters((current) => ({ ...current, query: value }))}
          placeholder="Descripcion, cuenta o categoria"
        />
      </div>

      {/* Tipo */}
      <div className="flex flex-col gap-1 w-36">
        <label className="app-label">Tipo</label>
        <Select
          value={filters.transactionType}
          onChange={(value) => setFilters((current) => ({ ...current, transactionType: value as FiltersState['transactionType'] }))}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'INCOME', label: 'Ingresos' },
            { value: 'EXPENSE', label: 'Gastos' },
          ]}
          className="w-full"
          active={filters.transactionType !== 'all'}
        />
      </div>

      {/* Moneda */}
      <div className="flex flex-col gap-1 w-28">
        <label className="app-label">Moneda</label>
        <Select
          value={filters.currency}
          onChange={(value) => setFilters((current) => ({ ...current, currency: value as FiltersState['currency'] }))}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'COP', label: 'COP' },
            { value: 'USD', label: 'USD' },
          ]}
          className="w-full"
          active={filters.currency !== 'all'}
        />
      </div>

      {/* Cuenta */}
      <div className="flex flex-col gap-1 w-44">
        <label className="app-label">Cuenta</label>
        <Select
          value={filters.accountId}
          onChange={(value) => setFilters((current) => ({ ...current, accountId: value }))}
          options={[
            { value: 'all', label: 'Todas' },
            ...accounts.map((account) => ({ value: String(account.id), label: account.name })),
          ]}
          className="w-full"
          active={filters.accountId !== 'all'}
        />
      </div>

      {/* Periodo */}
      <div className="flex flex-col gap-1 w-44">
        <label className="app-label">Periodo</label>
        <Select
          value={filters.period}
          onChange={(value) => setFilters((current) => ({ ...current, period: value as PeriodFilter }))}
          options={[
            { value: 'today', label: 'Hoy' },
            { value: '7d', label: 'Ultimos 7 dias' },
            { value: '30d', label: 'Ultimos 30 dias' },
            { value: 'month', label: 'Mes actual' },
            { value: 'custom', label: 'Personalizado' },
            { value: 'all', label: 'Todos' },
          ]}
          active={filters.period !== 'all'}
          className="w-full"
        />
      </div>

      {/* Rango personalizado — se inyecta como campo extra */}
      {filters.period === 'custom' && (
        <>
          <DatePicker
            label="Desde"
            value={derivedRange.from || datasetRange.min}
            onChange={(value) => setFilters((current) => ({ ...current, from: value }))}
            min={datasetRange.min}
            max={derivedRange.to || datasetRange.max}
          />
          <DatePicker
            label="Hasta"
            value={derivedRange.to || datasetRange.max}
            onChange={(value) => setFilters((current) => ({ ...current, to: value }))}
            min={derivedRange.from || datasetRange.min}
            max={datasetRange.max}
          />
        </>
      )}
    </FilterCard>
  )
}
