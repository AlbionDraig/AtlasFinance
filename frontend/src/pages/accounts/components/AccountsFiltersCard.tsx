import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import FilterCard from '@/components/ui/FilterCard'
import SearchInput from '@/components/ui/SearchInput'
import Select from '@/components/ui/Select'
import type { Bank } from '@/api/banks'

export interface AccountsFiltersState {
  query: string
  accountType: 'all' | 'savings' | 'checking'
  currency: 'all' | 'COP' | 'USD'
  bankId: string
  pageSize: number
}

interface AccountsFiltersCardProps {
  filters: AccountsFiltersState
  setFilters: Dispatch<SetStateAction<AccountsFiltersState>>
  banks: Bank[]
  activeFilters: string[]
  onResetFilters: () => void
}

export default function AccountsFiltersCard({
  filters,
  setFilters,
  banks,
  activeFilters,
  onResetFilters,
}: AccountsFiltersCardProps) {
  const { t } = useTranslation()
  return (
    <FilterCard sticky activeFilters={activeFilters} onReset={onResetFilters}>
      {/* Search runs against server-side filters in parent container. */}
      <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
        <label className="app-label">{t('common.search')}</label>
        <SearchInput
          value={filters.query}
          onChange={(value) => setFilters((current) => ({ ...current, query: value }))}
          placeholder={t('accounts.filter_search_placeholder')}
        />
      </div>

      <div className="flex flex-col gap-1 w-36">
        <label className="app-label">{t('accounts.field_type')}</label>
        <Select
          value={filters.accountType}
          onChange={(value) => setFilters((current) => ({ ...current, accountType: value as AccountsFiltersState['accountType'] }))}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'savings', label: t('accounts.type_savings') },
            { value: 'checking', label: t('accounts.type_checking') },
          ]}
          className="w-full"
          active={filters.accountType !== 'all'}
        />
      </div>

      <div className="flex flex-col gap-1 w-28">
        <label className="app-label">{t('accounts.field_currency')}</label>
        <Select
          value={filters.currency}
          onChange={(value) => setFilters((current) => ({ ...current, currency: value as AccountsFiltersState['currency'] }))}
          options={[
            { value: 'all', label: t('common.allFem') },
            { value: 'COP', label: 'COP' },
            { value: 'USD', label: 'USD' },
          ]}
          className="w-full"
          active={filters.currency !== 'all'}
        />
      </div>

      <div className="flex flex-col gap-1 w-44">
        <label className="app-label">{t('accounts.field_bank')}</label>
        <Select
          value={filters.bankId}
          onChange={(value) => setFilters((current) => ({ ...current, bankId: value }))}
          options={[
            { value: 'all', label: t('common.all') },
            ...banks.map((bank) => ({ value: String(bank.id), label: bank.name })),
          ]}
          className="w-full"
          active={filters.bankId !== 'all'}
        />
      </div>
    </FilterCard>
  )
}
