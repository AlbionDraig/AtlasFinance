import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { type Category } from '@/api/categories'
import { pocketsApi } from '@/api/pockets'
import { transactionsApi, type TransactionFilters } from '@/api/transactions'
import type { Account, Transaction } from '@/types'
import TransactionEditModal from './components/TransactionEditModal'
import MoveToPocketModal from './components/MoveToPocketModal'
import TransactionsFiltersCard from './components/TransactionsFiltersCard'
import TransactionsHistoryCard from './components/TransactionsHistoryCard'
import TransferModal from './components/TransferModal'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import PageSkeleton from '@/components/ui/PageSkeleton'
import { useToast } from '@/hooks/useToast'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import { useTransactionsCatalogs, useTransactionsList } from '@/hooks/useTransactionsData'
import { trackUxEvent } from '@/lib/uxTelemetry'
import { formatCurrency, getApiErrorMessage } from '@/lib/utils'
import type { FiltersState, FormState, PeriodFilter, TransactionType } from './types'

type TransactionFormErrors = Partial<Record<keyof FormState, string>>
const UNDO_WINDOW_MS = 5000

function toDateInputValue(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toTimeInputValue(value: Date): string {
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function buildDefaultFilters(): FiltersState {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 29)

  // Default view loads a practical 30-day window with moderate pagination.
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

/**
 * Hidrata los filtros desde la URL. Los valores ausentes caen al default,
 * de modo que enlaces compartidos sólo necesitan transportar lo no-default.
 */
function buildFiltersFromParams(params: URLSearchParams): FiltersState {
  const defaults = buildDefaultFilters()
  const transactionType = params.get('type')
  const currency = params.get('currency')
  const period = params.get('period')
  const pageSizeRaw = Number(params.get('pageSize'))
  return {
    query: params.get('q') ?? defaults.query,
    transactionType: transactionType === 'INCOME' || transactionType === 'EXPENSE' ? transactionType : 'all',
    currency: currency === 'COP' || currency === 'USD' ? currency : 'all',
    accountId: params.get('account') ?? defaults.accountId,
    period: ['all', 'today', '7d', '30d', 'month', 'custom'].includes(String(period))
      ? (period as PeriodFilter)
      : defaults.period,
    from: params.get('from') ?? defaults.from,
    to: params.get('to') ?? defaults.to,
    pageSize: Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : defaults.pageSize,
  }
}

/**
 * Serializa sólo los filtros que difieren del default, para mantener URLs cortas.
 */
function filtersToSearchParams(filters: FiltersState): URLSearchParams {
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

function buildDefaultForm(): FormState {
  // Empty form baseline reused on create flow and after successful submit.
  return {
    description: '',
    amount: '',
    accountId: '',
    categoryId: 'none',
    transactionType: '',
    occurredDate: '',
    occurredTime: '',
  }
}

function normalizeTransactionType(value: string | null | undefined): TransactionType {
  return String(value ?? '').toLowerCase() === 'income' ? 'INCOME' : 'EXPENSE'
}

function getCategoryName(categoryId: number | null, categories: Category[], noCategory: string): string {
  if (categoryId == null) return noCategory
  return categories.find((category) => category.id === categoryId)?.name ?? noCategory
}

function getAccountName(accountId: number, accounts: Account[]): string {
  const account = accounts.find((item) => item.id === accountId)
  return account ? `${account.name} (${account.currency})` : `Cuenta #${accountId}`
}

function getCompactAccountName(accountId: number, accounts: Account[]): string {
  return getAccountName(accountId, accounts).replace(/\s+\((COP|USD)\)$/, '')
}

function getPeriodLabel(period: PeriodFilter, t: (key: string) => string): string {
  if (period === 'today') return t('transactions.filter_period_today')
  if (period === '7d') return t('transactions.filter_period_7d')
  if (period === '30d') return t('transactions.filter_period_30d')
  if (period === 'month') return t('transactions.filter_period_month')
  if (period === 'custom') return t('transactions.filter_period_custom')
  return t('transactions.filter_period_all')
}

function resolvePeriodRange(period: PeriodFilter, fallbackFrom: string, fallbackTo: string): { from: string; to: string } {
  const today = toDateInputValue(new Date())
  // Preset periods override custom date inputs to avoid ambiguous filter combinations.
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
  if (period === 'month') {
    return { from: `${today.slice(0, 7)}-01`, to: today }
  }
  return { from: fallbackFrom, to: fallbackTo }
}

function buildTransactionParams(
  filters: FiltersState,
  query: string,
  page: number,
): TransactionFilters {
  const range = resolvePeriodRange(filters.period, filters.from, filters.to)
  const skip = (page - 1) * filters.pageSize
  // Convert UI state + current page into API contract for server-side pagination.
  return {
    start_date: range.from ? `${range.from}T00:00:00` : undefined,
    end_date: range.to ? `${range.to}T23:59:59` : undefined,
    account_id: filters.accountId !== 'all' ? Number(filters.accountId) : undefined,
    transaction_type: filters.transactionType !== 'all' ? filters.transactionType.toLowerCase() : undefined,
    currency: filters.currency !== 'all' ? filters.currency : undefined,
    search: query.trim() || undefined,
    skip,
    limit: filters.pageSize,
  }
}

export default function TransactionsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState<FormState>(() => buildDefaultForm())
  const [filters, setFilters] = useState<FiltersState>(() => buildFiltersFromParams(searchParams))
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [moveToPocketOpen, setMoveToPocketOpen] = useState(false)
  const [formErrors, setFormErrors] = useState<TransactionFormErrors>({})
  const [pendingDeletedIds, setPendingDeletedIds] = useState<Set<number>>(new Set())
  const pendingDeleteTimeoutsRef = useRef<Map<number, number>>(new Map())

  // Catálogos: carga única tras montar.
  const { accounts, categories, pockets, loading: catalogsLoading } = useTransactionsCatalogs()

  // Parámetros de la API derivados de filtros + query debounceado + página actual.
  const transactionParams = useMemo(
    () => buildTransactionParams(filters, debouncedQuery, page),
    [filters, debouncedQuery, page],
  )
  const transactionParamsKey = useMemo(
    () => JSON.stringify(transactionParams),
    [transactionParams],
  )
  const { transactions, total, loading: listLoading, reload: reloadTransactions } = useTransactionsList(
    transactionParams as Record<string, unknown>,
    transactionParamsKey,
  )
  // loading combinado ya no se usa directamente; se usan catalogsLoading y listLoading por separado.

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(filters.query), 400)
    return () => clearTimeout(timer)
  }, [filters.query])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, filters.transactionType, filters.currency, filters.accountId, filters.period, filters.from, filters.to, filters.pageSize])

  // Sync filters to URL search params (replace history to avoid polluting it on every keystroke).
  useEffect(() => {
    const next = filtersToSearchParams(filters)
    const current = searchParams.toString()
    if (next.toString() !== current) {
      setSearchParams(next, { replace: true })
    }
    // Intentionally exclude searchParams/setSearchParams to avoid feedback loop.

  }, [filters])

  useEffect(() => {
    requestAnimationFrame(() => {
      const main = document.querySelector('main.app-page')
      if (main) main.scrollTop = main.scrollHeight
    })
  }, [page])

  const derivedRange = resolvePeriodRange(filters.period, filters.from, filters.to)
  const selectedAccount = accounts.find((account) => String(account.id) === form.accountId) ?? null
  const accountCurrency = selectedAccount?.currency ?? 'COP'
  const categoryOptions = useMemo(() => {
    const filtered = categories.filter((category) => (
      form.transactionType === 'INCOME'
        ? category.category_type !== 'expense'
        : category.category_type !== 'income'
    ))
    return filtered.length ? filtered : categories
  }, [categories, form.transactionType])

  const visibleTransactions = useMemo(
    () => transactions.filter((transaction) => !pendingDeletedIds.has(transaction.id)),
    [transactions, pendingDeletedIds],
  )

  const incomeTotal = visibleTransactions
    .filter((transaction) => normalizeTransactionType(String(transaction.transaction_type)) === 'INCOME')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  const expenseTotal = visibleTransactions
    .filter((transaction) => normalizeTransactionType(String(transaction.transaction_type)) === 'EXPENSE')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  const visibleTotal = Math.max(0, total - pendingDeletedIds.size)
  // totalPages derived from server total; paginatedTransactions IS the full page (no client slice).
  const totalPages = Math.max(1, Math.ceil(visibleTotal / filters.pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * filters.pageSize
  const endIndex = Math.min(startIndex + visibleTransactions.length, visibleTotal)
  const paginatedTransactions = visibleTransactions
  const noCategoryLabel = t('transactions.no_category')
  const activeFilters = useMemo(() => {
    const chips: Array<{ id: string; label: string }> = []
    if (filters.transactionType !== 'all') {
      chips.push({
        id: 'type',
        label: t(filters.transactionType === 'INCOME' ? 'transactions.chip_type_income' : 'transactions.chip_type_expense'),
      })
    }
    if (filters.currency !== 'all') {
      chips.push({
        id: 'currency',
        label: t('transactions.chip_currency', { value: filters.currency }),
      })
    }
    if (filters.accountId !== 'all') {
      chips.push({
        id: 'account',
        label: t('transactions.chip_account', { value: getCompactAccountName(Number(filters.accountId), accounts) }),
      })
    }
    if (filters.period !== 'all') {
      chips.push({
        id: 'period',
        label: t('transactions.chip_period', { value: getPeriodLabel(filters.period, t) }),
      })
    }
    if (filters.query.trim()) {
      chips.push({
        id: 'search',
        label: t('transactions.chip_search', { value: filters.query.trim() }),
      })
    }
    return chips
  }, [filters.transactionType, filters.currency, filters.accountId, filters.period, filters.query, accounts, t])

  function handleRemoveFilter(id: string) {
    switch (id) {
      case 'type':
        setFilters(current => ({ ...current, transactionType: 'all' }))
        break
      case 'currency':
        setFilters(current => ({ ...current, currency: 'all' }))
        break
      case 'account':
        setFilters(current => ({ ...current, accountId: 'all' }))
        break
      case 'period':
        setFilters(current => ({ ...current, period: 'all' }))
        break
      case 'search':
        setFilters(current => ({ ...current, query: '' }))
        break
    }
    trackUxEvent('transactions_filter_removed', { filterId: id })
  }

  function resetForm() {
    setEditingId(null)
    setModalOpen(false)
    setForm(buildDefaultForm())
    setFormErrors({})
  }

  async function handleExportCSV() {
    setExporting(true)
    try {
      const range = resolvePeriodRange(filters.period, filters.from, filters.to)
      const params = {
        start_date: range.from ? `${range.from}T00:00:00` : undefined,
        end_date: range.to ? `${range.to}T23:59:59` : undefined,
        account_id: filters.accountId !== 'all' ? Number(filters.accountId) : undefined,
        transaction_type: filters.transactionType !== 'all' ? filters.transactionType.toLowerCase() : undefined,
        currency: filters.currency !== 'all' ? filters.currency : undefined,
        search: debouncedQuery.trim() || undefined,
      }
      const response = await transactionsApi.export(params)
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'transactions.csv'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      toast(getApiErrorMessage(exportError, t('transactions.toast_export_error')), 'error')
    } finally {
      setExporting(false)
    }
  }

  function handleEdit(transaction: Transaction) {
    const occurredAt = new Date(transaction.occurred_at)
    setEditingId(transaction.id)
    setModalOpen(true)
    setForm({
      description: transaction.description,
      amount: String(transaction.amount),
      accountId: String(transaction.account_id),
      categoryId: transaction.category_id == null ? 'none' : String(transaction.category_id),
      transactionType: normalizeTransactionType(String(transaction.transaction_type)),
      occurredDate: toDateInputValue(occurredAt),
      occurredTime: toTimeInputValue(occurredAt),
    })
    setFormErrors({})
  }

  function validateTransactionForm(): TransactionFormErrors {
    const errors: TransactionFormErrors = {}

    if (form.description.trim().length < 2) {
      errors.description = t('transactions.toast_desc_short')
    }
    if (!form.transactionType) {
      errors.transactionType = t('transactions.toast_select_type')
    }

    const amount = Number(form.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      errors.amount = t('transactions.toast_amount_zero')
    }
    if (!form.accountId) {
      errors.accountId = t('transactions.toast_select_account')
    }
    if (form.transactionType === 'EXPENSE' && (!form.categoryId || form.categoryId === 'none')) {
      errors.categoryId = t('transactions.toast_category_required')
    }
    if (!form.occurredDate) {
      errors.occurredDate = t('transactions.toast_select_date')
    }
    if (!form.occurredTime) {
      errors.occurredTime = t('transactions.toast_select_time')
    }
    if (!selectedAccount) {
      errors.accountId = t('transactions.toast_no_account')
    }

    return errors
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateTransactionForm()
    setFormErrors(errors)
    if (Object.keys(errors).length) {
      trackUxEvent('transactions_validation_failed', {
        errorCount: Object.keys(errors).length,
        hasAccountError: Boolean(errors.accountId),
        hasAmountError: Boolean(errors.amount),
        hasCategoryError: Boolean(errors.categoryId),
      })
      const firstError = Object.values(errors)[0]
      if (firstError) {
        toast(firstError, 'error')
      }
      return
    }

    const amount = Number(form.amount)

    const account = selectedAccount
    if (!account) {
      toast(t('transactions.toast_no_account'), 'error')
      return
    }

    const occurredAt = `${form.occurredDate}T${form.occurredTime || '00:00'}:00`
    const payload = {
      account_id: account.id,
      amount,
      description: form.description.trim(),
      category_id: form.categoryId === 'none' ? null : Number(form.categoryId),
      pocket_id: null,
      currency: account.currency,
      transaction_type: form.transactionType.toLowerCase() as Transaction['transaction_type'],
      occurred_at: occurredAt,
    } satisfies Omit<Transaction, 'id'>

    setSaving(true)
    try {
      if (editingId != null) {
        await transactionsApi.update(editingId, payload)
        toast(t('transactions.toast_updated'))
      } else {
        await transactionsApi.create(payload)
        toast(t('transactions.toast_saved'))
      }
      resetForm()
      await reloadTransactions()
      // Balances and pocket totals depend on transactions — keep their caches fresh.
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pockets })
    } catch (submitError) {
      toast(getApiErrorMessage(submitError, t('transactions.toast_save_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTransfer(form: { fromAccountId: string; toAccountId: string; amount: string; occurredDate: string; occurredTime: string }) {
    const amount = Number(form.amount)
    const occurredAt = `${form.occurredDate}T${form.occurredTime}:00`

    setSaving(true)
    try {
      await transactionsApi.transfer({
        from_account_id: Number(form.fromAccountId),
        to_account_id: Number(form.toAccountId),
        amount,
        occurred_at: occurredAt,
      })
      toast(t('transactions.toast_transfer_ok'))
      setTransferOpen(false)
      await reloadTransactions()
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts })
    } catch (transferError) {
      toast(getApiErrorMessage(transferError, t('transactions.toast_transfer_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleMoveToPocket(form: {
    accountId: string
    pocketId: string
    amount: string
    occurredDate: string
    occurredTime: string
  }) {
    const amount = Number(form.amount)
    const occurredAt = `${form.occurredDate}T${form.occurredTime}:00`
    setSaving(true)
    try {
      await pocketsApi.moveFunds({
        amount,
        account_id: Number(form.accountId),
        pocket_id: Number(form.pocketId),
        occurred_at: occurredAt,
      })
      setMoveToPocketOpen(false)
      toast(t('transactions.toast_pocket_ok'))
      await reloadTransactions()
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pockets })
    } catch (moveError) {
      toast(getApiErrorMessage(moveError, t('transactions.toast_pocket_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(transactionId: number) {
    setDeletingId(null)
    setPendingDeleteId(null)
    trackUxEvent('transactions_delete_requested', { transactionId })

    setPendingDeletedIds((current) => {
      const next = new Set(current)
      next.add(transactionId)
      return next
    })

    const timeoutId = window.setTimeout(async () => {
      pendingDeleteTimeoutsRef.current.delete(transactionId)
      try {
        await transactionsApi.delete(transactionId)
        if (editingId === transactionId) resetForm()
        await reloadTransactions()
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts })
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pockets })
      } catch (deleteError) {
        setPendingDeletedIds((current) => {
          const next = new Set(current)
          next.delete(transactionId)
          return next
        })
        toast(getApiErrorMessage(deleteError, t('transactions.toast_delete_error')), 'error')
      }
    }, UNDO_WINDOW_MS)

    pendingDeleteTimeoutsRef.current.set(transactionId, timeoutId)
    toast(t('transactions.toast_deleted'), 'success', {
      actionLabel: t('common.undo'),
      onAction: () => {
        trackUxEvent('transactions_delete_undo', { transactionId })
        const pendingTimeoutId = pendingDeleteTimeoutsRef.current.get(transactionId)
        if (pendingTimeoutId != null) {
          window.clearTimeout(pendingTimeoutId)
          pendingDeleteTimeoutsRef.current.delete(transactionId)
          setPendingDeletedIds((current) => {
            const next = new Set(current)
            next.delete(transactionId)
            return next
          })
        }
      },
    })
  }

  useEffect(() => {
    if (pendingDeletedIds.size === 0) {
      return
    }
    const existingIds = new Set(transactions.map((transaction) => transaction.id))
    setPendingDeletedIds((current) => {
      let changed = false
      const next = new Set<number>()
      current.forEach((id) => {
        if (existingIds.has(id)) {
          next.add(id)
        } else {
          changed = true
        }
      })
      return changed ? next : current
    })
  }, [transactions, pendingDeletedIds.size])

  useEffect(() => {
    return () => {
      pendingDeleteTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      pendingDeleteTimeoutsRef.current.clear()
    }
  }, [])

  if (catalogsLoading) {
    return <PageSkeleton cards={3} rows={8} columns={6} />
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="app-title text-xl">{t('transactions.title')}</h1>
          <p className="app-subtitle text-sm mt-0.5">{t('transactions.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => { void handleExportCSV() }}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand text-brand hover:bg-brand-light px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
          </svg>
          {exporting ? t('common.loading') : t('transactions.export_csv')}
        </button>
      </div>

      {modalOpen && (
        <TransactionEditModal
          form={form}
          errors={formErrors}
          setForm={setForm}
          setErrors={setFormErrors}
          accounts={accounts}
          categoryOptions={categoryOptions}
          accountCurrency={accountCurrency}
          editingId={editingId}
          saving={saving}
          maxDate={toDateInputValue(new Date())}
          onSubmit={handleSubmit}
          onClose={() => resetForm()}
        />
      )}

      {transferOpen && (
        <TransferModal
          accounts={accounts}
          saving={saving}
          maxDate={toDateInputValue(new Date())}
          onSubmit={handleTransfer}
          onClose={() => setTransferOpen(false)}
        />
      )}

      {moveToPocketOpen && (
        <MoveToPocketModal
          accounts={accounts}
          pockets={pockets}
          saving={saving}
          maxDate={toDateInputValue(new Date())}
          onSubmit={handleMoveToPocket}
          onClose={() => setMoveToPocketOpen(false)}
        />
      )}

      {pendingDeleteId !== null && (
        <ConfirmDeleteModal
          loading={deletingId === pendingDeleteId}
          onConfirm={() => { void handleDelete(pendingDeleteId) }}
          onClose={() => setPendingDeleteId(null)}
        />
      )}

      {/* Sticky filters */}
      <TransactionsFiltersCard
        filters={filters}
        setFilters={setFilters}
        accounts={accounts}
        activeFilters={activeFilters}
        datasetRange={{ min: '2000-01-01', max: toDateInputValue(new Date()) }}
        derivedRange={derivedRange}
        onResetFilters={() => {
          trackUxEvent('transactions_filters_reset')
          setFilters(buildDefaultFilters())
        }}
        onRemoveFilter={handleRemoveFilter}
      />

      {/* Transactions table */}
      <TransactionsHistoryCard
        filteredTransactions={visibleTransactions}
        paginatedTransactions={paginatedTransactions}
        total={visibleTotal}
        loading={listLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        deletingId={deletingId}
        accounts={accounts}
        categories={categories}
        onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setPage((current) => Math.min(totalPages, current + 1))}
        pageSize={filters.pageSize}
        onPageSizeChange={(size) => {
          trackUxEvent('transactions_page_size_changed', { pageSize: size })
          setFilters((current) => ({ ...current, pageSize: size }))
        }}
        incomeTotal={incomeTotal}
        expenseTotal={expenseTotal}
        currency={filters.currency === 'USD' ? 'USD' : 'COP'}
        onEdit={handleEdit}
        onDelete={(transactionId) => {
          trackUxEvent('transactions_delete_modal_opened', { transactionId })
          setPendingDeleteId(transactionId)
        }}
        getCompactAccountName={getCompactAccountName}
        getCategoryName={(id, cats) => getCategoryName(id, cats, noCategoryLabel)}
        formatCurrency={formatCurrency}
        normalizeTransactionType={normalizeTransactionType}
        onCreate={() => {
          trackUxEvent('transactions_modal_opened', { source: 'table_create' })
          resetForm()
          setModalOpen(true)
        }}
      />

      <FloatingActionMenu
        hidden={modalOpen || transferOpen || moveToPocketOpen || pendingDeleteId !== null}
        ariaLabel={t('transactions.fab_menu_label')}
        items={[
          {
            key: 'move-to-pocket',
            label: t('transactions.fab_pocket'),
            onClick: () => {
              trackUxEvent('transactions_modal_opened', { source: 'fab_move_to_pocket' })
              setMoveToPocketOpen(true)
            },
            icon: (
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M11 7l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 6h5M4 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
              </svg>
            ),
          },
          {
            key: 'transfer',
            label: t('transactions.fab_transfer'),
            onClick: () => {
              trackUxEvent('transactions_modal_opened', { source: 'fab_transfer' })
              setTransferOpen(true)
            },
            icon: (
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M3 10h14M13 6l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 14l-4-4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
          {
            key: 'register-transaction',
            label: t('transactions.fab_register'),
            onClick: () => {
              trackUxEvent('transactions_modal_opened', { source: 'fab_register' })
              resetForm()
              setModalOpen(true)
            },
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  )
}
