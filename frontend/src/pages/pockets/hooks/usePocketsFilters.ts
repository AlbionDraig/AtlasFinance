import { useMemo, useState } from 'react'
import type { Bank } from '@/api/banks'
import type { Account, Pocket } from '@/types'
import type { PocketFiltersState } from '../components/PocketsFiltersCard'

const DEFAULT_FILTERS: PocketFiltersState = {
  query: '',
  accountId: 'all',
  bankId: 'all',
  currency: 'all',
}

interface AccountVisualStyle {
  accent: string
  softBg: string
  softBorder: string
  softText: string
}

const ACCOUNT_BASE_COLORS: Array<{ accent: string; softText: string }> = [
  { accent: 'var(--af-accent)', softText: 'var(--af-accent-soft-text)' },
  { accent: 'var(--af-positive)', softText: 'var(--af-positive-soft-text)' },
  { accent: 'var(--af-warning)', softText: 'var(--af-negative-soft-text)' },
  { accent: 'var(--af-accent-deep)', softText: 'var(--af-accent-deep)' },
]

function buildAccountVisualStyle(index: number): AccountVisualStyle {
  const base = ACCOUNT_BASE_COLORS[index % ACCOUNT_BASE_COLORS.length]
  const tier = Math.floor(index / ACCOUNT_BASE_COLORS.length)
  const tint = Math.min(14 + tier * 8, 46)
  const borderTint = Math.min(tint + 8, 58)

  return {
    accent: base.accent,
    softBg: `color-mix(in srgb, ${base.accent} ${tint}%, white)`,
    softBorder: `color-mix(in srgb, ${base.accent} ${borderTint}%, white)`,
    softText: base.softText,
  }
}

interface UsePocketsFiltersParams {
  pockets: Pocket[]
  accounts: Account[]
  banks: Bank[]
  t: (key: string, params?: Record<string, unknown>) => string
}

export function usePocketsFilters({ pockets, accounts, banks, t }: UsePocketsFiltersParams) {
  const [filters, setFilters] = useState<PocketFiltersState>(DEFAULT_FILTERS)

  const accountById = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]))
  }, [accounts])

  const bankById = useMemo(() => {
    return new Map(banks.map((bank) => [bank.id, bank]))
  }, [banks])

  const accountStyleById = useMemo(() => {
    const uniqueAccountIds = [...new Set(accounts.map((account) => account.id))].sort((a, b) => a - b)
    return new Map(uniqueAccountIds.map((accountId, index) => [accountId, buildAccountVisualStyle(index)]))
  }, [accounts])

  const filteredPockets = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase()

    return pockets
      .filter((pocket) => {
        const accountName = accountById.get(pocket.account_id)?.name ?? ''
        const bankName = bankById.get(accountById.get(pocket.account_id)?.bank_id ?? -1)?.name ?? ''

        if (normalizedQuery) {
          const value = [pocket.name, accountName, bankName, pocket.currency].join(' ').toLowerCase()
          if (!value.includes(normalizedQuery)) return false
        }

        if (filters.accountId !== 'all' && String(pocket.account_id) !== filters.accountId) {
          return false
        }

        if (filters.bankId !== 'all') {
          const pocketBankId = accountById.get(pocket.account_id)?.bank_id
          if (String(pocketBankId) !== filters.bankId) return false
        }

        if (filters.currency !== 'all' && pocket.currency !== filters.currency) {
          return false
        }

        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [accountById, bankById, pockets, filters])

  const activeFilters = useMemo(() => {
    const list: string[] = []
    const normalizedQuery = filters.query.trim()
    if (normalizedQuery) list.push(t('pockets.chip_search', { value: normalizedQuery }))

    if (filters.accountId !== 'all') {
      const accountName = accountById.get(Number(filters.accountId))?.name
      list.push(t('pockets.chip_account', { value: accountName ?? `#${filters.accountId}` }))
    }

    if (filters.bankId !== 'all') {
      const bankName = bankById.get(Number(filters.bankId))?.name
      list.push(t('pockets.chip_bank', { value: bankName ?? `#${filters.bankId}` }))
    }

    if (filters.currency !== 'all') {
      list.push(t('pockets.chip_currency', { value: filters.currency }))
    }

    return list
  }, [filters, accountById, bankById, t])

  const totalCOP = useMemo(
    () => filteredPockets.filter((pocket) => pocket.currency === 'COP').reduce((sum, pocket) => sum + pocket.balance, 0),
    [filteredPockets],
  )

  const totalUSD = useMemo(
    () => filteredPockets.filter((pocket) => pocket.currency === 'USD').reduce((sum, pocket) => sum + pocket.balance, 0),
    [filteredPockets],
  )

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  return {
    filters,
    setFilters,
    resetFilters,
    accountById,
    bankById,
    accountStyleById,
    filteredPockets,
    activeFilters,
    totalCOP,
    totalUSD,
  }
}
