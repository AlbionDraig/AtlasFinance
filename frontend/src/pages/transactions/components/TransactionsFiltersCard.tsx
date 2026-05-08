import { useState, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
import FilterCard from '@/components/ui/FilterCard'
import Modal from '@/components/ui/Modal'
import SearchInput from '@/components/ui/SearchInput'
import type { Account } from '@/types'
import type { FiltersState, PeriodFilter } from '../types'

interface TransactionsFiltersCardProps {
  filters: FiltersState
  setFilters: Dispatch<SetStateAction<FiltersState>>
  accounts: Account[]
  activeFilters: Array<{ id: string; label: string }>
  datasetRange: { min: string; max: string }
  derivedRange: { from: string; to: string }
  onResetFilters: () => void
  onRemoveFilter: (id: string) => void
}

export default function TransactionsFiltersCard({
  filters,
  setFilters,
  accounts,
  activeFilters,
  datasetRange,
  derivedRange,
  onResetFilters,
  onRemoveFilter,
}: TransactionsFiltersCardProps) {
  const { t } = useTranslation()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Presets rápidos de período
  const periodPresets = [
    { key: 'today', label: t('transactions.filter_period_today'), value: 'today' as PeriodFilter },
    { key: '7d', label: t('transactions.filter_period_7d'), value: '7d' as PeriodFilter },
    { key: '30d', label: t('transactions.filter_period_30d'), value: '30d' as PeriodFilter },
    { key: 'month', label: t('transactions.filter_period_month'), value: 'month' as PeriodFilter },
  ]

  function renderPeriodPresets() {
    return (
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center">{t('transactions.quick_filters')}</span>
        {periodPresets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => setFilters((current) => ({ ...current, period: preset.value }))}
            aria-pressed={filters.period === preset.value}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 ${
              filters.period === preset.value
                ? 'bg-brand text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    )
  }

  function renderFilterFields() {
    return (
      <>
        {/* Buscar */}
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="app-label">{t('common.search')}</label>
          <SearchInput
            value={filters.query}
            onChange={(value) => setFilters((current) => ({ ...current, query: value }))}
            placeholder={t('transactions.filter_search_placeholder')}
          />
        </div>

        {/* Tipo */}
        <div className="flex flex-col gap-1 w-36">
          <label className="app-label">{t('common.type')}</label>
          <Select
            value={filters.transactionType}
            onChange={(value) => setFilters((current) => ({ ...current, transactionType: value as FiltersState['transactionType'] }))}
            options={[
              { value: 'all', label: t('transactions.filter_type_all') },
              { value: 'INCOME', label: t('transactions.filter_type_income') },
              { value: 'EXPENSE', label: t('transactions.filter_type_expense') },
            ]}
            className="w-full"
            active={filters.transactionType !== 'all'}
          />
        </div>

        {/* Moneda */}
        <div className="flex flex-col gap-1 w-28">
          <label className="app-label">{t('common.currency')}</label>
          <Select
            value={filters.currency}
            onChange={(value) => setFilters((current) => ({ ...current, currency: value as FiltersState['currency'] }))}
            options={[
              { value: 'all', label: t('common.allFem') },
              { value: 'COP', label: 'COP' },
              { value: 'USD', label: 'USD' },
            ]}
            className="w-full"
            active={filters.currency !== 'all'}
          />
        </div>

        {/* Cuenta */}
        <div className="flex flex-col gap-1 w-44">
          <label className="app-label">{t('common.bank')}</label>
          <Select
            value={filters.accountId}
            onChange={(value) => setFilters((current) => ({ ...current, accountId: value }))}
            options={[
              { value: 'all', label: t('transactions.filter_account_all') },
              ...accounts.map((account) => ({ value: String(account.id), label: account.name })),
            ]}
            className="w-full"
            active={filters.accountId !== 'all'}
          />
        </div>

        {/* Periodo */}
        <div className="flex flex-col gap-1 w-44">
          <label className="app-label">{t('transactions.filter_period_label')}</label>
          <Select
            value={filters.period}
            onChange={(value) => setFilters((current) => ({ ...current, period: value as PeriodFilter }))}
            options={[
              { value: 'today', label: t('transactions.filter_period_today') },
              { value: '7d', label: t('transactions.filter_period_7d') },
              { value: '30d', label: t('transactions.filter_period_30d') },
              { value: 'month', label: t('transactions.filter_period_month') },
              { value: 'custom', label: t('transactions.filter_period_custom') },
              { value: 'all', label: t('transactions.filter_period_all') },
            ]}
            active={filters.period !== 'all'}
            className="w-full"
          />
        </div>

        {/* Rango personalizado — se inyecta como campo extra */}
        {filters.period === 'custom' && (
          <>
            {/* Keep custom range bounded by dataset limits and from<=to constraints. */}
            <DatePicker
              label={t('common.from')}
              value={derivedRange.from || datasetRange.min}
              onChange={(value) => setFilters((current) => ({ ...current, from: value }))}
              min={datasetRange.min}
              max={derivedRange.to || datasetRange.max}
            />
            <DatePicker
              label={t('common.until')}
              value={derivedRange.to || datasetRange.max}
              onChange={(value) => setFilters((current) => ({ ...current, to: value }))}
              min={derivedRange.from || datasetRange.min}
              max={datasetRange.max}
            />
          </>
        )}
      </>
    )
  }

  return (
    <div className="space-y-3">
      <div className="px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="inline-flex w-full items-center justify-between rounded-lg border border-neutral-100 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label={t('transactions.mobile_filters_open')}
        >
          <span>{t('transactions.mobile_filters_open')}</span>
          {activeFilters.length > 0 && (
            <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs text-brand-text">
              {t('transactions.mobile_filters_count', { count: activeFilters.length })}
            </span>
          )}
        </button>
      </div>

      {/* Presets rápidos de período (desktop) */}
      <div className="hidden flex-wrap gap-2 px-4 md:flex">
        {renderPeriodPresets()}
      </div>

      {/* Filtros principales (desktop) */}
      <div className="hidden md:block">
        <FilterCard sticky activeFilters={activeFilters} onReset={onResetFilters} onRemoveFilter={onRemoveFilter}>
          {renderFilterFields()}
        </FilterCard>
      </div>

      {mobileFiltersOpen && (
        <Modal onClose={() => setMobileFiltersOpen(false)} maxWidth="max-w-2xl">
          <section className="rounded-xl border border-neutral-100 bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <h2 className="text-base font-medium text-neutral-900">{t('transactions.mobile_filters_title')}</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-md border border-neutral-100 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="mb-3">{renderPeriodPresets()}</div>

            <FilterCard activeFilters={activeFilters} onReset={onResetFilters} onRemoveFilter={onRemoveFilter}>
              {renderFilterFields()}
            </FilterCard>
          </section>
        </Modal>
      )}
    </div>
  )
}
