import type { Dispatch, SetStateAction } from 'react'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
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
    <div className="overflow-visible bg-white border border-neutral-100 border-t-4 border-t-brand ring-2 ring-brand/20 rounded-2xl shadow-xl p-5 space-y-4">
      {/* Filter inputs row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="app-label">Buscar</label>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            className="app-control w-full"
            placeholder="Descripcion, cuenta o categoria"
          />
        </div>

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

        <div className="flex flex-col gap-1">
          <label className="app-label opacity-0 select-none" aria-hidden="true">_</label>
          <button
            type="button"
            disabled={activeFilters.length === 0}
            onClick={onResetFilters}
            className="flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:border-neutral-100 disabled:text-neutral-400 border-brand bg-brand text-white hover:bg-brand-hover hover:border-brand-hover disabled:bg-transparent disabled:border-neutral-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Custom date range */}
      {filters.period === 'custom' && (
        <div className="flex flex-wrap gap-3">
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
        </div>
      )}

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}
