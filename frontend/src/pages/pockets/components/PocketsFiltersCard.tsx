import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import type { Account } from '@/types'
import type { Bank } from '@/api/banks'
import FilterCard from '@/components/ui/FilterCard'
import SearchInput from '@/components/ui/SearchInput'
import Select from '@/components/ui/Select'

export interface PocketFiltersState {
  query: string
  accountId: string
  bankId: string
  currency: 'all' | 'COP' | 'USD'
}

interface PocketsFiltersCardProps {
  filters: PocketFiltersState
  setFilters: Dispatch<SetStateAction<PocketFiltersState>>
  accounts: Account[]
  banks: Bank[]
  activeFilters: string[]
  onResetFilters: () => void
}

export default function PocketsFiltersCard({
  filters,
  setFilters,
  accounts,
  banks,
  activeFilters,
  onResetFilters,
}: PocketsFiltersCardProps) {
  const { t } = useTranslation()
  return (
    <FilterCard sticky activeFilters={activeFilters} onReset={onResetFilters}>
      <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
        <label className="app-label">{t('common.search')}</label>
        <SearchInput
          value={filters.query}
          onChange={(value) => setFilters(current => ({ ...current, query: value }))}
          placeholder={t('pockets.filter_search_placeholder')}
        />
      </div>

      <div className="flex flex-col gap-1 w-52">
        <label className="app-label">{t('common.bank')}</label>
        <Select
          value={filters.accountId}
          onChange={(value) => setFilters(current => ({ ...current, accountId: value }))}
          options={[
            { value: 'all', label: t('pockets.filter_account_all') },
            ...accounts.map(account => ({ value: String(account.id), label: account.name })),
          ]}
          className="w-full"
          active={filters.accountId !== 'all'}
        />
      </div>

      <div className="flex flex-col gap-1 w-52">
        <label className="app-label">{t('common.bank')}</label>
        <Select
          value={filters.bankId}
          onChange={(value) => setFilters(current => ({ ...current, bankId: value }))}
          options={[
            { value: 'all', label: t('pockets.filter_bank_all') },
            ...banks.map(bank => ({ value: String(bank.id), label: bank.name })),
          ]}
          className="w-full"
          active={filters.bankId !== 'all'}
        />
      </div>

      <div className="flex flex-col gap-1 w-36">
        <label className="app-label">{t('common.currency')}</label>
        <Select
          value={filters.currency}
          onChange={(value) => setFilters(current => ({
            ...current,
            currency: value as PocketFiltersState['currency'],
          }))}
          options={[
            { value: 'all', label: t('pockets.filter_currency_all') },
            { value: 'COP', label: 'COP' },
            { value: 'USD', label: 'USD' },
          ]}
          className="w-full"
          active={filters.currency !== 'all'}
        />
      </div>
    </FilterCard>
  )
}
