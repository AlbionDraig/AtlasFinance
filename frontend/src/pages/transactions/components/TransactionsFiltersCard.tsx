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
  incomeTotal: number
  expenseTotal: number
  onResetFilters: () => void
  formatCurrency: (value: number, currency: string) => string
}

export default function TransactionsFiltersCard({
  filters,
  setFilters,
  accounts,
  activeFilters,
  datasetRange,
  derivedRange,
  incomeTotal,
  expenseTotal,
  onResetFilters,
  formatCurrency,
}: TransactionsFiltersCardProps) {
  return (
    <div className="app-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="app-section-title">Filtros</h2>
        <button type="button" className="text-sm app-link" onClick={onResetFilters}>
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

      {/* Bottom bar: flujo neto */}
      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3">
        <div className="rounded-lg bg-[var(--af-bg-soft)] px-4 py-2.5 text-sm text-[var(--af-text-muted)]">
          Flujo neto{' '}
          <span className={incomeTotal - expenseTotal >= 0 ? 'tone-positive font-medium' : 'tone-negative font-medium'}>
            {formatCurrency(incomeTotal - expenseTotal, filters.currency === 'USD' ? 'USD' : 'COP')}
          </span>
        </div>
      </div>
    </div>
  )
}
