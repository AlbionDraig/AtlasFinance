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
    <div className="bg-white border border-neutral-100 border-t-4 border-t-brand ring-2 ring-brand/20 rounded-2xl shadow-xl p-5 space-y-4 overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="app-section-title">Filtros</h2>
        <button
          type="button"
          disabled={activeFilters.length === 0}
          onClick={onResetFilters}
          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:border-neutral-100 disabled:text-neutral-400 border-brand text-brand-text hover:bg-brand-light"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Limpiar filtros
        </button>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </div>
      )}

      {/* Main filter grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 sm:col-span-2 lg:col-span-4">
          <label className="app-label">Buscar</label>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            className="app-control w-full"
            placeholder="Descripcion, cuenta o categoria"
          />
        </div>

        <div className="space-y-1">
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

        <div className="space-y-1">
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

        <div className="space-y-1">
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

        <div className="space-y-1">
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
      </div>

      {/* Custom date range — only visible when period is 'custom' */}
      {filters.period === 'custom' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

    </div>
  )
}
