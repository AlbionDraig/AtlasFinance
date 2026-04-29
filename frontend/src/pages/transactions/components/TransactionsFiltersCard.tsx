import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  return (
    <FilterCard sticky activeFilters={activeFilters} onReset={onResetFilters}>
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
    </FilterCard>
  )
}
