import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
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
import { useTransactionsCatalogs, useTransactionsList } from '@/hooks/useTransactionsData'
import { trackUxEvent } from '@/lib/uxTelemetry'
import { formatCurrency } from '@/lib/utils'
import { getCategoryName, getCompactAccountName, normalizeTransactionType, toDateInputValue } from './transactionUtils'
import { useTransactionForm } from './hooks/useTransactionForm'
import { useTransactionsFilters } from './hooks/useTransactionsFilters'
import { useTransactionsActions } from './hooks/useTransactionsActions'

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

  const {
    saving,
    exporting,
    deletingId,
    pendingDeleteId,
    pendingDeletedCount,
    setPendingDeleteId,
    visibleTransactions,
    handleExportCSV,
    handleSubmit,
    handleTransfer,
    handleMoveToPocket,
    handleDelete,
  } = useTransactionsActions({
    transactions,
    filters,
    derivedRange,
    queryClient,
    form,
    selectedAccount,
    editingId,
    validate,
    setFormErrors,
    resetForm,
    setTransferOpen,
    setMoveToPocketOpen,
    toast,
    t,
  })

  const incomeTotal = visibleTransactions
    .filter((tx) => normalizeTransactionType(String(tx.transaction_type)) === 'INCOME')
    .reduce((sum, tx) => sum + Number(tx.amount), 0)
  const expenseTotal = visibleTransactions
    .filter((tx) => normalizeTransactionType(String(tx.transaction_type)) === 'EXPENSE')
    .reduce((sum, tx) => sum + Number(tx.amount), 0)
  const visibleTotal = Math.max(0, total - pendingDeletedCount)
  const totalPages = Math.max(1, Math.ceil(visibleTotal / filters.pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * filters.pageSize
  const endIndex = Math.min(startIndex + visibleTransactions.length, visibleTotal)
  const noCategoryLabel = t('transactions.no_category')

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
