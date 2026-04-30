import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/hooks/useToast'
import { useTransactionsCatalogs, useTransactionsList } from '@/hooks/useTransactionsData'
import { formatCurrency, getApiErrorMessage } from '@/lib/utils'
import type { FiltersState, FormState, PeriodFilter, TransactionType } from './types'

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
  const [form, setForm] = useState<FormState>(() => buildDefaultForm())
  const [filters, setFilters] = useState<FiltersState>(() => buildDefaultFilters())
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [moveToPocketOpen, setMoveToPocketOpen] = useState(false)

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
  const loading = catalogsLoading || listLoading

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(filters.query), 400)
    return () => clearTimeout(timer)
  }, [filters.query])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, filters.transactionType, filters.currency, filters.accountId, filters.period, filters.from, filters.to, filters.pageSize])

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

  const incomeTotal = transactions
    .filter((transaction) => normalizeTransactionType(String(transaction.transaction_type)) === 'INCOME')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  const expenseTotal = transactions
    .filter((transaction) => normalizeTransactionType(String(transaction.transaction_type)) === 'EXPENSE')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  // totalPages derived from server total; paginatedTransactions IS the full page (no client slice).
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * filters.pageSize
  const endIndex = Math.min(startIndex + transactions.length, total)
  const paginatedTransactions = transactions
  const noCategoryLabel = t('transactions.no_category')
  const activeFilters = [
    filters.transactionType !== 'all' ? t(filters.transactionType === 'INCOME' ? 'transactions.chip_type_income' : 'transactions.chip_type_expense') : null,
    filters.currency !== 'all' ? t('transactions.chip_currency', { value: filters.currency }) : null,
    filters.accountId !== 'all' ? t('transactions.chip_account', { value: getCompactAccountName(Number(filters.accountId), accounts) }) : null,
    filters.period !== 'all' ? t('transactions.chip_period', { value: getPeriodLabel(filters.period, t) }) : null,
    filters.query.trim() ? t('transactions.chip_search', { value: filters.query.trim() }) : null,
  ].filter(Boolean) as string[]

  function resetForm() {
    setEditingId(null)
    setModalOpen(false)
    setForm(buildDefaultForm())
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
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (form.description.trim().length < 2) {
      toast(t('transactions.toast_desc_short'), 'error')
      return
    }

    if (!form.transactionType) {
      toast(t('transactions.toast_select_type'), 'error')
      return
    }

    const amount = Number(form.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      toast(t('transactions.toast_amount_zero'), 'error')
      return
    }

    if (!form.accountId) {
      toast(t('transactions.toast_select_account'), 'error')
      return
    }

    if (form.transactionType === 'EXPENSE' && (!form.categoryId || form.categoryId === 'none')) {
      toast(t('transactions.toast_category_required'), 'error')
      return
    }

    if (!form.occurredDate) {
      toast(t('transactions.toast_select_date'), 'error')
      return
    }

    if (!form.occurredTime) {
      toast(t('transactions.toast_select_time'), 'error')
      return
    }

    if (!selectedAccount) {
      toast(t('transactions.toast_no_account'), 'error')
      return
    }

    const occurredAt = `${form.occurredDate}T${form.occurredTime || '00:00'}:00`
    const payload = {
      account_id: selectedAccount.id,
      amount,
      description: form.description.trim(),
      category_id: form.categoryId === 'none' ? null : Number(form.categoryId),
      pocket_id: null,
      currency: selectedAccount.currency,
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
    } catch (moveError) {
      toast(getApiErrorMessage(moveError, t('transactions.toast_pocket_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(transactionId: number) {
    setDeletingId(transactionId)
    setPendingDeleteId(null)

    try {
      await transactionsApi.delete(transactionId)
      if (editingId === transactionId) resetForm()
      toast(t('transactions.toast_deleted'))
      await reloadTransactions()
    } catch (deleteError) {
      toast(getApiErrorMessage(deleteError, t('transactions.toast_delete_error')), 'error')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="app-panel p-6 flex min-h-72 items-center justify-center">
        <LoadingSpinner text={t('transactions.loading')} />
      </div>
    )
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      {/* Page header */}
      <div>
        <h1 className="app-title text-xl">{t('transactions.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">{t('transactions.subtitle')}</p>
      </div>

      {modalOpen && (
        <TransactionEditModal
          form={form}
          setForm={setForm}
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
        onResetFilters={() => setFilters(buildDefaultFilters())}
      />

      {/* Transactions table */}
      <TransactionsHistoryCard
        filteredTransactions={transactions}
        paginatedTransactions={paginatedTransactions}
        total={total}
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
        onPageSizeChange={(size) => setFilters((current) => ({ ...current, pageSize: size }))}
        incomeTotal={incomeTotal}
        expenseTotal={expenseTotal}
        currency={filters.currency === 'USD' ? 'USD' : 'COP'}
        onEdit={handleEdit}
        onDelete={(transactionId) => {
          setPendingDeleteId(transactionId)
        }}
        getCompactAccountName={getCompactAccountName}
        getCategoryName={(id, cats) => getCategoryName(id, cats, noCategoryLabel)}
        formatCurrency={formatCurrency}
        normalizeTransactionType={normalizeTransactionType}
      />

      <FloatingActionMenu
        hidden={modalOpen || transferOpen || moveToPocketOpen || pendingDeleteId !== null}
        ariaLabel={t('transactions.fab_menu_label')}
        items={[
          {
            key: 'move-to-pocket',
            label: t('transactions.fab_pocket'),
            onClick: () => setMoveToPocketOpen(true),
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
            onClick: () => setTransferOpen(true),
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
            onClick: () => { resetForm(); setModalOpen(true) },
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
