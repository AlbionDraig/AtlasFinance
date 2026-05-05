import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Tooltip from '@/components/ui/Tooltip'
import EditButton from '@/components/ui/EditButton'
import DeleteButton from '@/components/ui/DeleteButton'
import SkeletonTable from '@/components/ui/SkeletonTable'
import { useTranslation } from 'react-i18next'
import type { Category } from '@/api/categories'
import type { Account, Transaction } from '@/types'

interface TransactionsHistoryCardProps {
  filteredTransactions: Transaction[]
  paginatedTransactions: Transaction[]
  total: number
  loading?: boolean
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  deletingId: number | null
  accounts: Account[]
  categories: Category[]
  onPrevPage: () => void
  onNextPage: () => void
  onEdit: (transaction: Transaction) => void
  onDelete: (transactionId: number) => void
  getCompactAccountName: (accountId: number, accounts: Account[]) => string
  getCategoryName: (categoryId: number | null, categories: Category[]) => string
  formatCurrency: (value: number, currency: string) => string
  normalizeTransactionType: (value: string | null | undefined) => 'INCOME' | 'EXPENSE'
  pageSize: number
  onPageSizeChange: (size: number) => void
  incomeTotal: number
  expenseTotal: number
  currency: string
}

export default function TransactionsHistoryCard({
  filteredTransactions,
  paginatedTransactions,
  total,
  loading = false,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  deletingId,
  accounts,
  categories,
  onPrevPage,
  onNextPage,
  onEdit,
  onDelete,
  getCompactAccountName,
  getCategoryName,
  formatCurrency,
  normalizeTransactionType,
  pageSize,
  onPageSizeChange,
  incomeTotal,
  expenseTotal,
  currency,
}: TransactionsHistoryCardProps) {
  const { t } = useTranslation()
  type MetricVariant = 'neutral' | 'positive' | 'negative'

  function isTransferTransaction(transaction: Transaction): boolean {
    return transaction.description.startsWith('Transferencia: ')
  }

  // Summary chips reflect totals for the full filtered set (not only current page).
  const netFlow = incomeTotal - expenseTotal
  const metrics: Array<{ key: string; variant: MetricVariant; label: string; help: string }> = [
    {
      key: 'count',
      variant: 'neutral' as const,
      label: t('transactions.metric_total', { count: filteredTransactions.length }),
      help: t('transactions.metric_total_help'),
    },
    {
      key: 'income',
      variant: 'positive' as const,
      label: `${t('transactions.filter_type_income')} ${formatCurrency(incomeTotal, currency)}`,
      help: t('transactions.metric_income_help'),
    },
    {
      key: 'expense',
      variant: 'negative' as const,
      label: `${t('transactions.filter_type_expense')} ${formatCurrency(expenseTotal, currency)}`,
      help: t('transactions.metric_expense_help'),
    },
    {
      key: 'net',
      variant: netFlow >= 0 ? 'positive' : 'negative',
      label: `${t('dashboard.chart_legend_cashflow')} ${formatCurrency(netFlow, currency)}`,
      help: t('transactions.metric_flow_help'),
    },
  ]

  return (
    <div className="app-card overflow-visible">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-neutral-100 bg-neutral-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light text-brand">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">{t('transactions.table_title')}</h2>
            <p className="text-xs text-neutral-400">
              {total
                ? t('transactions.table_range', { start: startIndex + 1, end: endIndex, total })
                : t('common.noResults')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 bg-white px-6 py-3">
        {metrics.map((metric) => (
          <Tooltip
            key={metric.key}
            content={metric.help}
            ariaLabel={`${metric.label}. ${metric.help}`}
          >
            <Badge variant={metric.variant}>{metric.label}</Badge>
          </Tooltip>
        ))}
      </div>

      {/* Empty state */}
      {!paginatedTransactions.length ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">{t('transactions.table_empty_title')}</p>
            <p className="mt-1 text-xs text-neutral-400">{t('transactions.table_empty_desc')}</p>
          </div>
        </div>
      ) : loading ? (
        <div className="p-2">
          <SkeletonTable rows={8} columns={6} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-36" />
              <col className="w-[26rem]" />
              <col className="w-44" />
              <col className="w-40" />
              <col className="w-40" />
              <col className="w-24" />
            </colgroup>
            <thead>
              <tr>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('transactions.table_col_date')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('transactions.table_col_desc')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('transactions.table_col_account')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('transactions.table_col_category')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('transactions.table_col_amount')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('transactions.table_col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((transaction) => {
                const isIncome = normalizeTransactionType(String(transaction.transaction_type)) === 'INCOME'
                const isTransfer = isTransferTransaction(transaction)
                return (
                  <tr key={transaction.id} className="group transition-colors hover:bg-brand-light/40 odd:bg-white even:bg-neutral-50/50">

                    {/* Fecha */}
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 whitespace-nowrap align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-neutral-900">
                          {new Date(transaction.occurred_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {new Date(transaction.occurred_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Descripción */}
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 align-middle max-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="block min-w-0 flex-1 truncate whitespace-nowrap text-sm font-medium text-neutral-900" title={transaction.description}>
                          {transaction.description}
                        </span>
                        <Tooltip
                          content={transaction.description}
                          ariaLabel={`Ver descripción completa: ${transaction.description}`}
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md text-neutral-400 hover:text-brand">
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                              <path d="M1.5 10s3-5.5 8.5-5.5S18.5 10 18.5 10s-3 5.5-8.5 5.5S1.5 10 1.5 10Z" stroke="currentColor" strokeWidth="1.5" />
                              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                          </span>
                        </Tooltip>
                      </div>
                    </td>

                    {/* Cuenta */}
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 align-middle">
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 whitespace-nowrap">
                        {getCompactAccountName(transaction.account_id, accounts)}
                      </span>
                    </td>

                    {/* Categoría */}
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-sm text-neutral-700 align-middle">
                      {getCategoryName(transaction.category_id, categories) || (
                        <span className="text-xs italic text-neutral-300">{t('transactions.no_category')}</span>
                      )}
                    </td>

                    {/* Monto */}
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-right align-middle">
                      <span className={`tabular-nums text-sm font-medium ${isIncome ? 'text-success' : 'text-warning'}`}>
                        <span className="mr-0.5 text-xs opacity-50">{isIncome ? '+' : '−'}</span>
                        {formatCurrency(Number(transaction.amount), transaction.currency)}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        {isTransfer ? (
                          // Transfer rows cannot be edited, only removed as a pair operation.
                          <DeleteButton onClick={() => onDelete(transaction.id)} loading={deletingId === transaction.id} />
                        ) : (
                          <>
                            {/* Editar */}
                            <EditButton onClick={() => onEdit(transaction)} />
                            {/* Eliminar */}
                            <DeleteButton onClick={() => onDelete(transaction.id)} loading={deletingId === transaction.id} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onPageSizeChange={onPageSizeChange}
      />

    </div>
  )
}

