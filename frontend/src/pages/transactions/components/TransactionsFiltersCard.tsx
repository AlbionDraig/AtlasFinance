import type { Dispatch, SetStateAction } from 'react'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
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
      <div className="flex items-center justify-between gap-3">
        <h2 className="app-section-title">Filtros</h2>
        <button type="button" className="text-sm app-link" onClick={onResetFilters}>
          Limpiar filtros
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((label) => (
            <span key={label} className="rounded-full bg-tone-neutral px-3 py-1 text-xs font-medium">
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-3">
        <div className="space-y-1 md:col-span-2 2xl:col-span-1">
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

        <div className="space-y-1">
          <label className="app-label">Por pagina</label>
          <Select
            value={String(filters.pageSize)}
            onChange={(value) => setFilters((current) => ({ ...current, pageSize: Number(value) }))}
            options={[
              { value: '25', label: '25' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <DatePicker
          label="Desde"
          value={derivedRange.from || datasetRange.min}
          onChange={(value) => setFilters((current) => ({ ...current, period: 'custom', from: value }))}
          min={datasetRange.min}
          max={derivedRange.to || datasetRange.max}
          disabled={filters.period !== 'custom'}
        />
        <DatePicker
          label="Hasta"
          value={derivedRange.to || datasetRange.max}
          onChange={(value) => setFilters((current) => ({ ...current, period: 'custom', to: value }))}
          min={derivedRange.from || datasetRange.min}
          max={datasetRange.max}
          disabled={filters.period !== 'custom'}
        />
        <div className="rounded-lg bg-[var(--af-bg-soft)] px-4 py-3 text-sm text-[var(--af-text-muted)]">
          Flujo neto{' '}
          <span className={incomeTotal - expenseTotal >= 0 ? 'tone-positive font-medium' : 'tone-negative font-medium'}>
            {formatCurrency(incomeTotal - expenseTotal, filters.currency === 'USD' ? 'USD' : 'COP')}
          </span>
        </div>
      </div>
    </div>
  )
}
