import { useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { accountsApi } from '@/api/accounts'
import { categoriesApi, type Category } from '@/api/categories'
import { transactionsApi } from '@/api/transactions'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
import type { Account, Transaction } from '@/types'

type TransactionType = 'INCOME' | 'EXPENSE'
type PeriodFilter = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom'

interface FormState {
  description: string
  amount: string
  accountId: string
  categoryId: string
  transactionType: TransactionType
  occurredDate: string
  occurredTime: string
}

interface FiltersState {
  query: string
  transactionType: 'all' | TransactionType
  currency: 'all' | 'COP' | 'USD'
  accountId: string
  period: PeriodFilter
  from: string
  to: string
  pageSize: number
}

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
    pageSize: 12,
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
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + filters.pageSize)
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

        <div className="grid gap-4">
          <form onSubmit={handleSubmit} className="order-3 app-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="app-section-title">{editingId != null ? 'Editar movimiento' : 'Registrar movimiento'}</h2>
              {editingId != null && (
                <span className="rounded-full bg-[var(--af-warning-soft)] px-3 py-1 text-xs font-medium text-[var(--af-negative)]">
                  Modo edición
                </span>
              )}
            </div>

            {formError && <p className="alert-error">{formError}</p>}

            <div className="space-y-1">
              <label className="app-label">Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="app-control w-full"
                placeholder="Ej: Supermercado, salario, gasolina"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
              <div className="space-y-1">
                <label className="app-label">Tipo</label>
                <select
                  value={form.transactionType}
                  onChange={(event) => setForm((current) => ({ ...current, transactionType: event.target.value as TransactionType, categoryId: 'none' }))}
                  className="app-control w-full"
                >
                  <option value="EXPENSE">Gasto</option>
                  <option value="INCOME">Ingreso</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="app-label">Monto</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  className="app-control w-full"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
              <div className="space-y-1">
                <label className="app-label">Cuenta</label>
                <select
                  value={form.accountId}
                  onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
                  className="app-control w-full"
                  disabled={!accounts.length}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="app-label">Categoría</label>
                <select
                  value={form.categoryId}
                  onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                  className="app-control w-full"
                >
                  <option value="none">Sin categoría</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
              <DatePicker
                label="Fecha"
                value={form.occurredDate}
                onChange={(value) => setForm((current) => ({ ...current, occurredDate: value }))}
                max={toDateInputValue(new Date())}
                className="w-full"
              />
              <div className="space-y-1">
                <label className="app-label">Hora</label>
                <input
                  type="time"
                  step="60"
                  value={form.occurredTime}
                  onChange={(event) => setForm((current) => ({ ...current, occurredTime: event.target.value }))}
                  className="app-control w-full"
                />
              </div>
            </div>

            <div className="rounded-lg bg-[var(--af-bg-soft)] px-4 py-3 text-sm text-[var(--af-text-muted)]">
              Moneda derivada de la cuenta: <span className="font-medium text-[var(--af-text)]">{accountCurrency}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="submit" className="app-btn-primary" disabled={saving || !accounts.length}>
                {saving ? 'Guardando...' : editingId != null ? 'Guardar cambios' : 'Guardar movimiento'}
              </button>
              <button type="button" className="app-btn-secondary" onClick={() => resetForm()}>
                {editingId != null ? 'Cancelar' : 'Limpiar'}
              </button>
            </div>
          </form>

          <div className="order-1 space-y-4">
            <div className="app-card p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="app-section-title">Filtros</h2>
                <button type="button" className="text-sm app-link" onClick={() => setFilters(buildDefaultFilters())}>
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
                    placeholder="Descripción, cuenta o categoría"
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
                  <label className="app-label">Período</label>
                  <Select
                    value={filters.period}
                    onChange={(value) => setFilters((current) => ({ ...current, period: value as PeriodFilter }))}
                    options={[
                      { value: 'today', label: 'Hoy' },
                      { value: '7d', label: 'Últimos 7 días' },
                      { value: '30d', label: 'Últimos 30 días' },
                      { value: 'month', label: 'Mes actual' },
                      { value: 'custom', label: 'Personalizado' },
                      { value: 'all', label: 'Todos' },
                    ]}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="app-label">Por página</label>
                  <Select
                    value={String(filters.pageSize)}
                    onChange={(value) => setFilters((current) => ({ ...current, pageSize: Number(value) }))}
                    options={[
                      { value: '8', label: '8' },
                      { value: '12', label: '12' },
                      { value: '20', label: '20' },
                      { value: '30', label: '30' },
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

            <div className="app-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--af-border)] px-5 py-4">
                <div>
                  <h2 className="app-section-title mb-1">Historial</h2>
                  <p className="app-subtitle text-sm">
                    Mostrando {filteredTransactions.length ? startIndex + 1 : 0} a {startIndex + paginatedTransactions.length} de {filteredTransactions.length} movimientos
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="app-btn-secondary !w-auto px-4 py-2"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage === 1}
                  >Anterior</button>
                  <button
                    type="button"
                    className="app-btn-secondary !w-auto px-4 py-2"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage === totalPages}
                  >Siguiente</button>
                </div>
              </div>

              {!paginatedTransactions.length ? (
                <div className="px-5 py-10 text-center">
                  <p className="app-title text-lg">No hay movimientos que coincidan con los filtros.</p>
                  <p className="app-subtitle mt-2">Ajusta el período, cambia la búsqueda o registra un nuevo movimiento.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[var(--af-border)]">
                    <thead className="bg-[var(--af-bg-soft)]">
                      <tr>
                        <th className="px-5 py-3 text-left app-label">Fecha</th>
                        <th className="px-5 py-3 text-left app-label">Descripción</th>
                        <th className="px-5 py-3 text-left app-label">Tipo</th>
                        <th className="px-5 py-3 text-left app-label">Moneda</th>
                        <th className="px-5 py-3 text-left app-label">Cuenta</th>
                        <th className="px-5 py-3 text-left app-label">Categoría</th>
                        <th className="px-5 py-3 text-right app-label">Monto</th>
                        <th className="px-5 py-3 text-right app-label">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--af-border)] bg-white">
                      {paginatedTransactions.map((transaction) => {
                        const isIncome = normalizeTransactionType(String(transaction.transaction_type)) === 'INCOME'
                        return (
                          <tr key={transaction.id} className="transition-colors hover:bg-[var(--af-bg-soft)]/70">
                            <td className="px-5 py-4 text-sm text-[var(--af-text-muted)] whitespace-nowrap">
                              {new Date(transaction.occurred_at).toLocaleString('es-CO', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-5 py-4 text-sm text-[var(--af-text)]">{transaction.description}</td>
                            <td className="px-5 py-4 text-sm">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${isIncome ? 'bg-tone-positive' : 'bg-tone-negative'}`}>
                                {isIncome ? 'Ingreso' : 'Gasto'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-[var(--af-text-muted)]">{transaction.currency}</td>
                            <td className="px-5 py-4 text-sm text-[var(--af-text-muted)]">{getCompactAccountName(transaction.account_id, accounts)}</td>
                            <td className="px-5 py-4 text-sm text-[var(--af-text-muted)]">{getCategoryName(transaction.category_id, categories)}</td>
                            <td className={`px-5 py-4 text-right text-sm font-medium whitespace-nowrap ${isIncome ? 'tone-positive' : 'tone-negative'}`}>
                              {isIncome ? '+' : '-'} {formatCurrency(Number(transaction.amount), transaction.currency)}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap justify-end gap-2">
                                <button type="button" className="app-btn-secondary !w-auto px-3 py-2" onClick={() => handleEdit(transaction)}>
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="max-w-max rounded-lg border border-[var(--af-accent-soft)] bg-[var(--af-accent-soft)] px-3 py-2 text-sm font-medium text-[var(--af-accent-soft-text)] transition-colors hover:bg-[var(--af-accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                  onClick={() => void handleDelete(transaction.id)}
                                  disabled={deletingId === transaction.id}
                                >
                                  {deletingId === transaction.id ? 'Eliminando...' : 'Eliminar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredTransactions.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--af-border)] px-5 py-4">
                  <p className="app-subtitle text-sm">Página {currentPage} de {totalPages}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="app-btn-secondary !w-auto px-4 py-2"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={currentPage === 1}
                    >←</button>
                    <button
                      type="button"
                      className="app-btn-secondary !w-auto px-4 py-2"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={currentPage === totalPages}
                    >→</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
