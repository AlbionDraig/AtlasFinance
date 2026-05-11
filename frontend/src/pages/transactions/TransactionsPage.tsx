import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { pocketsApi } from '@/api/pockets'
import { transactionsApi } from '@/api/transactions'
import type { Transaction } from '@/types'
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
import { buildTransactionPayload } from './transactionPayload'
import { getCategoryName, getCompactAccountName, normalizeTransactionType, toDateInputValue } from './transactionUtils'
import { useTransactionForm } from './hooks/useTransactionForm'
import { useTransactionsFilters } from './hooks/useTransactionsFilters'

const UNDO_WINDOW_MS = 5000

export default function TransactionsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ─── Catalogs ──────────────────────────────────────────────────────────────
  const { accounts, categories, pockets, loading: catalogsLoading } = useTransactionsCatalogs()

  // ─── Filters + pagination ──────────────────────────────────────────────────
  const {
    filters,
    setFilters,
    page,
    setPage,
    transactionParams,
    transactionParamsKey,
    derivedRange,
    activeFilters,
    handleRemoveFilter,
    resetFilters,
  } = useTransactionsFilters(accounts)

  // ─── Transactions list ─────────────────────────────────────────────────────
  const { transactions, total, loading: listLoading } = useTransactionsList(
    transactionParams,
    transactionParamsKey,
  )

  // ─── Form state ────────────────────────────────────────────────────────────
  const {
    form,
    setForm,
    formErrors,
    setFormErrors,
    editingId,
    modalOpen,
    transferOpen,
    moveToPocketOpen,
    setTransferOpen,
    setMoveToPocketOpen,
    selectedAccount,
    accountCurrency,
    categoryOptions,
    resetForm,
    openCreateModal,
    prepareEdit,
    validate,
  } = useTransactionForm(accounts, categories)

  // ─── Optimistic-delete with undo ───────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [pendingDeletedIds, setPendingDeletedIds] = useState<Set<number>>(new Set())
  const pendingDeleteTimeoutsRef = useRef<Map<number, number>>(new Map())

  const visibleTransactions = useMemo(
    () => transactions.filter((tx) => !pendingDeletedIds.has(tx.id)),
    [transactions, pendingDeletedIds],
  )

  const incomeTotal = visibleTransactions
    .filter((tx) => normalizeTransactionType(String(tx.transaction_type)) === 'INCOME')
    .reduce((sum, tx) => sum + Number(tx.amount), 0)
  const expenseTotal = visibleTransactions
    .filter((tx) => normalizeTransactionType(String(tx.transaction_type)) === 'EXPENSE')
    .reduce((sum, tx) => sum + Number(tx.amount), 0)
  const visibleTotal = Math.max(0, total - pendingDeletedIds.size)
  const totalPages = Math.max(1, Math.ceil(visibleTotal / filters.pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * filters.pageSize
  const endIndex = Math.min(startIndex + visibleTransactions.length, visibleTotal)
  const noCategoryLabel = t('transactions.no_category')

  useEffect(() => {
    if (pendingDeletedIds.size === 0) return
    const existingIds = new Set(transactions.map((tx) => tx.id))
    setPendingDeletedIds((current) => {
      let changed = false
      const next = new Set<number>()
      current.forEach((id) => {
        if (existingIds.has(id)) { next.add(id) } else { changed = true }
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

  // ─── CRUD handlers ─────────────────────────────────────────────────────────

  async function handleExportCSV() {
    setExporting(true)
    try {
      const params = {
        start_date: derivedRange.from ? `${derivedRange.from}T00:00:00` : undefined,
        end_date: derivedRange.to ? `${derivedRange.to}T23:59:59` : undefined,
        account_id: filters.accountId !== 'all' ? Number(filters.accountId) : undefined,
        transaction_type: filters.transactionType !== 'all' ? filters.transactionType.toLowerCase() : undefined,
        currency: filters.currency !== 'all' ? filters.currency : undefined,
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validate()
    setFormErrors(errors)
    if (Object.keys(errors).length) {
      trackUxEvent('transactions_validation_failed', {
        errorCount: Object.keys(errors).length,
        hasAccountError: Boolean(errors.accountId),
        hasAmountError: Boolean(errors.amount),
        hasCategoryError: Boolean(errors.categoryId),
      })
      const firstError = Object.values(errors)[0]
      if (firstError) toast(firstError, 'error')
      return
    }

    if (!selectedAccount) {
      toast(t('transactions.toast_no_account'), 'error')
      return
    }

    setSaving(true)
    try {
      const payload = buildTransactionPayload(form, selectedAccount)
      if (editingId != null) {
        await transactionsApi.update(editingId, payload)
        toast(t('transactions.toast_updated'))
      } else {
        await transactionsApi.create(payload)
        toast(t('transactions.toast_saved'))
      }
      resetForm()
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pockets })
    } catch (submitError) {
      toast(getApiErrorMessage(submitError, t('transactions.toast_save_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTransfer(transferForm: {
    fromAccountId: string
    toAccountId: string
    amount: string
    occurredDate: string
    occurredTime: string
  }) {
    setSaving(true)
    try {
      await transactionsApi.transfer({
        from_account_id: Number(transferForm.fromAccountId),
        to_account_id: Number(transferForm.toAccountId),
        amount: Number(transferForm.amount),
        occurred_at: `${transferForm.occurredDate}T${transferForm.occurredTime}:00`,
      })
      toast(t('transactions.toast_transfer_ok'))
      setTransferOpen(false)
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts })
    } catch (transferError) {
      toast(getApiErrorMessage(transferError, t('transactions.toast_transfer_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleMoveToPocket(moveForm: {
    accountId: string
    pocketId: string
    amount: string
    occurredDate: string
    occurredTime: string
  }) {
    setSaving(true)
    try {
      await pocketsApi.moveFunds({
        amount: Number(moveForm.amount),
        account_id: Number(moveForm.accountId),
        pocket_id: Number(moveForm.pocketId),
        occurred_at: `${moveForm.occurredDate}T${moveForm.occurredTime}:00`,
      })
      setMoveToPocketOpen(false)
      toast(t('transactions.toast_pocket_ok'))
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions })
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
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions })
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

      <TransactionsFiltersCard
        filters={filters}
        setFilters={setFilters}
        accounts={accounts}
        activeFilters={activeFilters}
        datasetRange={{ min: '2000-01-01', max: toDateInputValue(new Date()) }}
        derivedRange={derivedRange}
        onResetFilters={resetFilters}
        onRemoveFilter={handleRemoveFilter}
      />

      <TransactionsHistoryCard
        filteredTransactions={visibleTransactions}
        paginatedTransactions={visibleTransactions}
        total={visibleTotal}
        loading={listLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        deletingId={deletingId}
        accounts={accounts}
        categories={categories}
        onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
        pageSize={filters.pageSize}
        onPageSizeChange={(size) => {
          trackUxEvent('transactions_page_size_changed', { pageSize: size })
          setFilters((c) => ({ ...c, pageSize: size }))
        }}
        incomeTotal={incomeTotal}
        expenseTotal={expenseTotal}
        currency={filters.currency === 'USD' ? 'USD' : 'COP'}
        onEdit={(tx: Transaction) => {
          trackUxEvent('transactions_edit_opened', { transactionId: tx.id })
          prepareEdit(tx)
        }}
        onDelete={(transactionId: number) => {
          trackUxEvent('transactions_delete_modal_opened', { transactionId })
          setPendingDeleteId(transactionId)
        }}
        getCompactAccountName={(id: number) => getCompactAccountName(id, accounts)}
        getCategoryName={(id: number | null, cats: typeof categories) => getCategoryName(id, cats, noCategoryLabel)}
        formatCurrency={formatCurrency}
        normalizeTransactionType={normalizeTransactionType}
        onCreate={() => {
          trackUxEvent('transactions_modal_opened', { source: 'table_create' })
          openCreateModal()
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
              openCreateModal()
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
