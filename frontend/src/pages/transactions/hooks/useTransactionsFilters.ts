/**
 * Encapsulates filter state, URL/localStorage persistence, debounced query,
 * pagination reset, derived range, and active-filter chips for the
 * transactions page.
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { TransactionFilters } from '@/api/transactions'
import { trackUxEvent } from '@/lib/uxTelemetry'
import type { Account } from '@/types'
import { toDateInputValue } from '../transactionUtils'
import { getCompactAccountName } from '../transactionUtils'
import type { FiltersState, PeriodFilter } from '../types'

const TRANSACTIONS_FILTERS_STORAGE_KEY = 'atlas.transactions.filters'

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function buildDefaultFilters(): FiltersState {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 29)
  return {
    query: '',
    transactionType: 'all',
    currency: 'all',
    accountId: 'all',
    period: 'all',
    from: toDateInputValue(start),
    to: toDateInputValue(today),
    pageSize: 25,
  }
}

function buildFiltersFromParams(params: URLSearchParams): FiltersState {
  const defaults = buildDefaultFilters()
  const transactionType = params.get('type')
  const currency = params.get('currency')
  const period = params.get('period')
  const pageSizeRaw = Number(params.get('pageSize'))
  return {
    query: params.get('q') ?? defaults.query,
    transactionType:
      transactionType === 'INCOME' || transactionType === 'EXPENSE' ? transactionType : 'all',
    currency: currency === 'COP' || currency === 'USD' ? currency : 'all',
    accountId: params.get('account') ?? defaults.accountId,
    period: ['all', 'today', '7d', '30d', 'month', 'custom'].includes(String(period))
      ? (period as PeriodFilter)
      : defaults.period,
    from: params.get('from') ?? defaults.from,
    to: params.get('to') ?? defaults.to,
    pageSize:
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : defaults.pageSize,
  }
}

export function filtersToSearchParams(filters: FiltersState): URLSearchParams {
  const defaults = buildDefaultFilters()
  const params = new URLSearchParams()
  if (filters.query.trim() !== defaults.query) params.set('q', filters.query.trim())
  if (filters.transactionType !== defaults.transactionType) params.set('type', filters.transactionType)
  if (filters.currency !== defaults.currency) params.set('currency', filters.currency)
  if (filters.accountId !== defaults.accountId) params.set('account', filters.accountId)
  if (filters.period !== defaults.period) params.set('period', filters.period)
  if (filters.period === 'custom') {
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
  }
  if (filters.pageSize !== defaults.pageSize) params.set('pageSize', String(filters.pageSize))
  return params
}

export function resolvePeriodRange(
  period: PeriodFilter,
  fallbackFrom: string,
  fallbackTo: string,
): { from: string; to: string } {
  const today = toDateInputValue(new Date())
  if (period === 'all') return { from: '', to: '' }
  if (period === 'today') return { from: today, to: today }
  if (period === '7d') {
    const start = new Date()
    start.setDate(start.getDate() - 6)
    return { from: toDateInputValue(start), to: today }
  }
  if (period === '30d') {
    const start = new Date()
    start.setDate(start.getDate() - 29)
    return { from: toDateInputValue(start), to: today }
  }
  if (period === 'month') return { from: `${today.slice(0, 7)}-01`, to: today }
  return { from: fallbackFrom, to: fallbackTo }
}

function getPeriodLabel(period: PeriodFilter, t: (key: string) => string): string {
  if (period === 'today') return t('transactions.filter_period_today')
  if (period === '7d') return t('transactions.filter_period_7d')
  if (period === '30d') return t('transactions.filter_period_30d')
  if (period === 'month') return t('transactions.filter_period_month')
  if (period === 'custom') return t('transactions.filter_period_custom')
  return t('transactions.filter_period_all')
}

export function buildTransactionApiParams(
  filters: FiltersState,
  query: string,
  page: number,
): TransactionFilters {
  const range = resolvePeriodRange(filters.period, filters.from, filters.to)
  const skip = (page - 1) * filters.pageSize
  return {
    start_date: range.from ? `${range.from}T00:00:00` : undefined,
    end_date: range.to ? `${range.to}T23:59:59` : undefined,
    account_id: filters.accountId !== 'all' ? Number(filters.accountId) : undefined,
    transaction_type:
      filters.transactionType !== 'all' ? filters.transactionType.toLowerCase() : undefined,
    currency: filters.currency !== 'all' ? filters.currency : undefined,
    search: query.trim() || undefined,
    skip,
    limit: filters.pageSize,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface TransactionsFiltersResult {
  filters: FiltersState
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  debouncedQuery: string
  transactionParams: TransactionFilters
  transactionParamsKey: string
  derivedRange: { from: string; to: string }
  activeFilters: Array<{ id: string; label: string }>
  handleRemoveFilter: (id: string) => void
  resetFilters: () => void
}

/**
 * Manages transaction filter state with URL search-param persistence,
 * localStorage persistence, debounced text query, and pagination reset.
 *
 * @param accounts - Needed only to render the account chip label.
 */
export function useTransactionsFilters(accounts: Account[]): TransactionsFiltersResult {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState<FiltersState>(() => {
    if (searchParams.toString()) return buildFiltersFromParams(searchParams)
    if (typeof window === 'undefined') return buildDefaultFilters()
    const stored = window.localStorage.getItem(TRANSACTIONS_FILTERS_STORAGE_KEY)
    return stored ? buildFiltersFromParams(new URLSearchParams(stored)) : buildDefaultFilters()
  })
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(filters.query), 400)
    return () => clearTimeout(timer)
  }, [filters.query])

  useEffect(() => {
    setPage(1)
  }, [
    debouncedQuery,
    filters.transactionType,
    filters.currency,
    filters.accountId,
    filters.period,
    filters.from,
    filters.to,
    filters.pageSize,
  ])

  // Sync to URL — intentionally excludes searchParams/setSearchParams to avoid loop.
  useEffect(() => {
    const next = filtersToSearchParams(filters)
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }

  }, [filters])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      TRANSACTIONS_FILTERS_STORAGE_KEY,
      filtersToSearchParams(filters).toString(),
    )
  }, [filters])

  useEffect(() => {
    requestAnimationFrame(() => {
      const main = document.querySelector('main.app-page')
      if (main) main.scrollTop = main.scrollHeight
    })
  }, [page])

  const transactionParams = useMemo(
    () => buildTransactionApiParams(filters, debouncedQuery, page),
    [filters, debouncedQuery, page],
  )
  const transactionParamsKey = useMemo(() => JSON.stringify(transactionParams), [transactionParams])
  const derivedRange = useMemo(
    () => resolvePeriodRange(filters.period, filters.from, filters.to),
    [filters.period, filters.from, filters.to],
  )

  const activeFilters = useMemo(() => {
    const chips: Array<{ id: string; label: string }> = []
    if (filters.transactionType !== 'all') {
      chips.push({
        id: 'type',
        label: t(
          filters.transactionType === 'INCOME'
            ? 'transactions.chip_type_income'
            : 'transactions.chip_type_expense',
        ),
      })
    }
    if (filters.currency !== 'all') {
      chips.push({ id: 'currency', label: t('transactions.chip_currency', { value: filters.currency }) })
    }
    if (filters.accountId !== 'all') {
      chips.push({
        id: 'account',
        label: t('transactions.chip_account', {
          value: getCompactAccountName(Number(filters.accountId), accounts),
        }),
      })
    }
    if (filters.period !== 'all') {
      chips.push({
        id: 'period',
        label: t('transactions.chip_period', { value: getPeriodLabel(filters.period, t) }),
      })
    }
    if (filters.query.trim()) {
      chips.push({ id: 'search', label: t('transactions.chip_search', { value: filters.query.trim() }) })
    }
    return chips
  }, [filters.transactionType, filters.currency, filters.accountId, filters.period, filters.query, accounts, t])

  function handleRemoveFilter(id: string) {
    switch (id) {
      case 'type': setFilters((c) => ({ ...c, transactionType: 'all' })); break
      case 'currency': setFilters((c) => ({ ...c, currency: 'all' })); break
      case 'account': setFilters((c) => ({ ...c, accountId: 'all' })); break
      case 'period': setFilters((c) => ({ ...c, period: 'all' })); break
      case 'search': setFilters((c) => ({ ...c, query: '' })); break
    }
    trackUxEvent('transactions_filter_removed', { filterId: id })
  }

  function resetFilters() {
    trackUxEvent('transactions_filters_reset')
    setFilters(buildDefaultFilters())
  }

  return {
    filters,
    setFilters,
    page,
    setPage,
    debouncedQuery,
    transactionParams,
    transactionParamsKey,
    derivedRange,
    activeFilters,
    handleRemoveFilter,
    resetFilters,
  }
}
