import { useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { accountsApi } from '@/api/accounts'
import { categoriesApi, type Category } from '@/api/categories'
import { transactionsApi } from '@/api/transactions'
import type { Account, Transaction } from '@/types'
import TransactionEditModal from './components/TransactionEditModal'
import TransactionFormCard from './components/TransactionFormCard'
import TransactionsFiltersCard from './components/TransactionsFiltersCard'
import TransactionsHistoryCard from './components/TransactionsHistoryCard'
import type { FiltersState, FormState, PeriodFilter, TransactionType } from './types'

const INCOME_HINTS = [
  'salario',
  'sueldo',
  'ingreso',
  'venta',
  'freelance',
  'interes',
  'interés',
  'dividendo',
  'bono',
  'comision',
  'comisión',
  'reembolso',
  'premio',
]

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

  return {
    query: '',
    transactionType: 'all',
    currency: 'all',
    accountId: 'all',
    period: '30d',
    from: toDateInputValue(start),
    to: toDateInputValue(today),
    pageSize: 25,
  }
}

function buildDefaultForm(accounts: Account[]): FormState {
  const now = new Date()
  return {
    description: '',
    amount: '',
    accountId: accounts[0] ? String(accounts[0].id) : '',
    categoryId: 'none',
    transactionType: 'EXPENSE',
    occurredDate: toDateInputValue(now),
    occurredTime: toTimeInputValue(now),
  }
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return fallback
}

function isIncomeCategory(label: string): boolean {
  const normalized = label.trim().toLowerCase()
  return INCOME_HINTS.some((hint) => normalized.includes(hint))
}

function normalizeTransactionType(value: string | null | undefined): TransactionType {
  return String(value ?? '').toLowerCase() === 'income' ? 'INCOME' : 'EXPENSE'
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function getCategoryName(categoryId: number | null, categories: Category[]): string {
  if (categoryId == null) return 'Sin categoría'
  return categories.find((category) => category.id === categoryId)?.name ?? 'Sin categoría'
}

function getAccountName(accountId: number, accounts: Account[]): string {
  const account = accounts.find((item) => item.id === accountId)
  return account ? `${account.name} (${account.currency})` : `Cuenta #${accountId}`
}

function getCompactAccountName(accountId: number, accounts: Account[]): string {
  return getAccountName(accountId, accounts).replace(/\s+\((COP|USD)\)$/, '')
}

function getDatasetRange(transactions: Transaction[]): { min: string; max: string } {
  if (!transactions.length) {
    const today = toDateInputValue(new Date())
    return { min: today, max: today }
  }

  const dates = transactions
    .map((transaction) => transaction.occurred_at.slice(0, 10))
    .sort((left, right) => left.localeCompare(right))

  return { min: dates[0], max: dates[dates.length - 1] }
}

function getPeriodLabel(period: PeriodFilter): string {
  if (period === 'today') return 'Hoy'
  if (period === '7d') return 'Últimos 7 días'
  if (period === '30d') return 'Últimos 30 días'
  if (period === 'month') return 'Mes actual'
  if (period === 'custom') return 'Personalizado'
  return 'Todos'
}

function resolvePeriodRange(period: PeriodFilter, fallbackFrom: string, fallbackTo: string, maxDate: string): { from: string; to: string } {
  const today = new Date()
  const max = maxDate || toDateInputValue(today)
  const maxAsDate = new Date(`${max}T00:00:00`)

  if (period === 'all') return { from: '', to: '' }
  if (period === 'today') return { from: max, to: max }
  if (period === '7d') {
    const start = new Date(maxAsDate)
    start.setDate(start.getDate() - 6)
    return { from: toDateInputValue(start), to: max }
  }
  if (period === '30d') {
    const start = new Date(maxAsDate)
    start.setDate(start.getDate() - 29)
    return { from: toDateInputValue(start), to: max }
  }
  if (period === 'month') {
    return { from: `${max.slice(0, 7)}-01`, to: max }
  }
  return { from: fallbackFrom, to: fallbackTo }
}

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [form, setForm] = useState<FormState>(() => buildDefaultForm([]))
  const [filters, setFilters] = useState<FiltersState>(() => buildDefaultFilters())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const [accountsResponse, categoriesResponse, transactionsResponse] = await Promise.all([
          accountsApi.list(),
          categoriesApi.list(),
          transactionsApi.list(),
        ])

        setAccounts(accountsResponse.data)
        setCategories(categoriesResponse.data)
        setTransactions(transactionsResponse.data)
        setForm((current) => current.accountId ? current : buildDefaultForm(accountsResponse.data))
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'No se pudieron cargar los movimientos.'))
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  useEffect(() => {
    if (!accounts.length) return
    setForm((current) => {
      if (current.accountId && accounts.some((account) => String(account.id) === current.accountId)) {
        return current
      }
      return { ...current, accountId: String(accounts[0].id) }
    })
  }, [accounts])

  useEffect(() => {
    setPage(1)
  }, [filters.query, filters.transactionType, filters.currency, filters.accountId, filters.period, filters.from, filters.to, filters.pageSize])

  const datasetRange = getDatasetRange(transactions)
  const derivedRange = resolvePeriodRange(filters.period, filters.from, filters.to, datasetRange.max)
  const selectedAccount = accounts.find((account) => String(account.id) === form.accountId) ?? null
  const accountCurrency = selectedAccount?.currency ?? 'COP'
  const categoryOptions = useMemo(() => {
    const filtered = categories.filter((category) => (
      form.transactionType === 'INCOME' ? isIncomeCategory(category.name) : !isIncomeCategory(category.name)
    ))
    return filtered.length ? filtered : categories
  }, [categories, form.transactionType])

  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter((transaction) => {
        const query = filters.query.trim().toLowerCase()
        const description = transaction.description.toLowerCase()
        const categoryName = getCategoryName(transaction.category_id, categories).toLowerCase()
        const accountName = getAccountName(transaction.account_id, accounts).toLowerCase()
        const occurredDate = transaction.occurred_at.slice(0, 10)

        if (query && !description.includes(query) && !categoryName.includes(query) && !accountName.includes(query)) {
          return false
        }
        const txType = normalizeTransactionType(String(transaction.transaction_type))
        if (filters.transactionType !== 'all' && txType !== filters.transactionType) {
          return false
        }
        if (filters.currency !== 'all' && transaction.currency !== filters.currency) {
          return false
        }
        if (filters.accountId !== 'all' && String(transaction.account_id) !== filters.accountId) {
          return false
        }
        if (derivedRange.from && occurredDate < derivedRange.from) {
          return false
        }
        if (derivedRange.to && occurredDate > derivedRange.to) {
          return false
        }
        return true
      })
      .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
  }, [accounts, categories, derivedRange.from, derivedRange.to, filters.accountId, filters.currency, filters.query, filters.transactionType, transactions])

  const incomeTotal = filteredTransactions
    .filter((transaction) => normalizeTransactionType(String(transaction.transaction_type)) === 'INCOME')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  const expenseTotal = filteredTransactions
    .filter((transaction) => normalizeTransactionType(String(transaction.transaction_type)) === 'EXPENSE')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / filters.pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * filters.pageSize
  const endIndex = Math.min(startIndex + filters.pageSize, filteredTransactions.length)
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)
  const activeFilters = [
    filters.transactionType !== 'all' ? `Tipo: ${filters.transactionType === 'INCOME' ? 'Ingresos' : 'Gastos'}` : null,
    filters.currency !== 'all' ? `Moneda: ${filters.currency}` : null,
    filters.accountId !== 'all' ? `Cuenta: ${getCompactAccountName(Number(filters.accountId), accounts)}` : null,
    filters.period !== 'all' ? `Período: ${getPeriodLabel(filters.period)}` : null,
    filters.query.trim() ? `Búsqueda: ${filters.query.trim()}` : null,
  ].filter(Boolean) as string[]

  function resetForm(nextAccounts = accounts) {
    setEditingId(null)
    setFormError(null)
    setForm(buildDefaultForm(nextAccounts))
  }

  function handleEdit(transaction: Transaction) {
    const occurredAt = new Date(transaction.occurred_at)
    setEditingId(transaction.id)
    setSuccessMessage(null)
    setFormError(null)
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
    setFormError(null)
    setSuccessMessage(null)

    if (form.description.trim().length < 2) {
      setFormError('La descripción debe tener al menos 2 caracteres.')
      return
    }

    const amount = Number(form.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      setFormError('El monto debe ser mayor que 0.')
      return
    }

    if (!selectedAccount) {
      setFormError('Primero crea o selecciona una cuenta para registrar movimientos.')
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
      transaction_type: form.transactionType,
      occurred_at: occurredAt,
    } satisfies Omit<Transaction, 'id'>

    setSaving(true)
    try {
      if (editingId != null) {
        const response = await transactionsApi.update(editingId, payload)
        setTransactions((current) => current.map((transaction) => (
          transaction.id === editingId ? response.data : transaction
        )))
        setSuccessMessage('Movimiento actualizado con éxito.')
      } else {
        const response = await transactionsApi.create(payload)
        setTransactions((current) => [response.data, ...current])
        setSuccessMessage('Movimiento guardado con éxito.')
      }
      resetForm()
    } catch (submitError) {
      setFormError(getApiErrorMessage(submitError, 'No se pudo guardar el movimiento.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(transactionId: number) {
    if (!window.confirm('Se eliminará este movimiento. Esta acción no se puede deshacer.')) {
      return
    }

    setDeletingId(transactionId)
    setError(null)
    setSuccessMessage(null)

    try {
      await transactionsApi.delete(transactionId)
      setTransactions((current) => current.filter((transaction) => transaction.id !== transactionId))
      if (editingId === transactionId) resetForm()
      setSuccessMessage('Movimiento eliminado con éxito.')
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, 'No se pudo eliminar el movimiento.'))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="app-panel p-6 flex min-h-72 items-center justify-center">
        <div className="flex items-center gap-3 app-subtitle">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--af-border)] border-t-[var(--af-accent)]" />
          Cargando movimientos...
        </div>
      </div>
    )
  }

  if (error && !transactions.length && !accounts.length) {
    return <div className="alert-error max-w-xl mx-auto mt-8">{error}</div>
  }

  return (
    <div className="app-shell w-full max-w-7xl mx-auto space-y-6 overflow-x-hidden">
      <section className="app-panel w-full p-6 space-y-6 overflow-x-hidden">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="app-title text-2xl">Movimientos</h1>
            <p className="app-subtitle mt-1">Registra, filtra y administra tus ingresos y gastos desde una sola vista.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-tone-neutral px-3 py-1 text-xs font-medium">{filteredTransactions.length} movimientos</span>
            <span className="rounded-full bg-tone-positive px-3 py-1 text-xs font-medium">Ingresos {formatCurrency(incomeTotal, filters.currency === 'USD' ? 'USD' : 'COP')}</span>
            <span className="rounded-full bg-tone-negative px-3 py-1 text-xs font-medium">Gastos {formatCurrency(expenseTotal, filters.currency === 'USD' ? 'USD' : 'COP')}</span>
          </div>
        </div>

        {error && <p className="alert-error">{error}</p>}
        {successMessage && (
          <p className="rounded-lg border border-[color-mix(in_srgb,var(--af-positive)_35%,transparent)] bg-[var(--af-positive-soft)] px-3 py-2 text-sm text-[var(--af-positive-soft-text)]">
            {successMessage}
          </p>
        )}

        {editingId != null && (
          <TransactionEditModal
            form={form}
            setForm={setForm}
            accounts={accounts}
            categoryOptions={categoryOptions}
            accountCurrency={accountCurrency}
            editingId={editingId}
            saving={saving}
            formError={formError}
            maxDate={toDateInputValue(new Date())}
            onSubmit={handleSubmit}
            onClose={() => resetForm()}
          />
        )}

        <div className="grid gap-4">
          <TransactionFormCard
            form={form}
            setForm={setForm}
            accounts={accounts}
            categoryOptions={categoryOptions}
            accountCurrency={accountCurrency}
            editingId={null}
            saving={saving}
            formError={editingId == null ? formError : null}
            maxDate={toDateInputValue(new Date())}
            onSubmit={handleSubmit}
            onReset={() => resetForm()}
          />

          <div className="order-1 space-y-4">
            <TransactionsFiltersCard
              filters={filters}
              setFilters={setFilters}
              accounts={accounts}
              activeFilters={activeFilters}
              datasetRange={datasetRange}
              derivedRange={derivedRange}
              incomeTotal={incomeTotal}
              expenseTotal={expenseTotal}
              onResetFilters={() => setFilters(buildDefaultFilters())}
              formatCurrency={formatCurrency}
            />

            <TransactionsHistoryCard
              filteredTransactions={filteredTransactions}
              paginatedTransactions={paginatedTransactions}
              currentPage={currentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              deletingId={deletingId}
              accounts={accounts}
              categories={categories}
              onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
              onNextPage={() => setPage((current) => Math.min(totalPages, current + 1))}
              onEdit={handleEdit}
              onDelete={(transactionId) => {
                void handleDelete(transactionId)
              }}
              getCompactAccountName={getCompactAccountName}
              getCategoryName={getCategoryName}
              formatCurrency={formatCurrency}
              normalizeTransactionType={normalizeTransactionType}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
