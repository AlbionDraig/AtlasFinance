import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Tooltip from '@/components/ui/Tooltip'
import type { Category } from '@/api/categories'
import type { Account, Transaction } from '@/types'

interface TransactionsHistoryCardProps {
  filteredTransactions: Transaction[]
  paginatedTransactions: Transaction[]
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
  onCreateMovement: () => void
  incomeTotal: number
  expenseTotal: number
  currency: string
}

export default function TransactionsHistoryCard({
  filteredTransactions,
  paginatedTransactions,
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
  onCreateMovement,
  incomeTotal,
  expenseTotal,
  currency,
}: TransactionsHistoryCardProps) {
  const netFlow = incomeTotal - expenseTotal
  const metrics = [
    {
      key: 'count',
      variant: 'neutral' as const,
      label: `${filteredTransactions.length} movimientos`,
      help: 'Total de movimientos que cumplen los filtros actuales.',
    },
    {
      key: 'income',
      variant: 'positive' as const,
      label: `Ingresos ${formatCurrency(incomeTotal, currency)}`,
      help: 'Suma de transacciones de ingreso dentro del filtro activo.',
    },
    {
      key: 'expense',
      variant: 'negative' as const,
      label: `Gastos ${formatCurrency(expenseTotal, currency)}`,
      help: 'Suma de transacciones de gasto dentro del filtro activo.',
    },
    {
      key: 'net',
      variant: (netFlow >= 0 ? 'positive' : 'negative') as const,
      label: `Flujo neto ${formatCurrency(netFlow, currency)}`,
      help: 'Diferencia entre ingresos y gastos en el filtro actual.',
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
            <h2 className="text-sm font-medium text-neutral-900">Historial de movimientos</h2>
            <p className="text-xs text-neutral-400">
              {filteredTransactions.length
                ? `${startIndex + 1}–${endIndex} de ${filteredTransactions.length} movimientos`
                : 'Sin resultados'}
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
            <p className="text-sm font-medium text-neutral-900">No hay movimientos</p>
            <p className="mt-1 text-xs text-neutral-400">Ajusta los filtros o registra un nuevo movimiento.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <colgroup>
              <col className="w-36" />
              <col />
              <col className="w-44" />
              <col className="w-40" />
              <col className="w-40" />
              <col className="w-24" />
            </colgroup>
            <thead>
              <tr>
                <th className="border-b-2 border-r border-white/20 border-b-brand-deep bg-brand-hover px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-white">Fecha</th>
                <th className="border-b-2 border-r border-white/20 border-b-brand-deep bg-brand-hover px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-white">Descripción</th>
                <th className="border-b-2 border-r border-white/20 border-b-brand-deep bg-brand-hover px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-white">Cuenta</th>
                <th className="border-b-2 border-r border-white/20 border-b-brand-deep bg-brand-hover px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-white">Categoría</th>
                <th className="border-b-2 border-r border-white/20 border-b-brand-deep bg-brand-hover px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-white">Monto</th>
                <th className="border-b-2 border-r border-white/20 border-b-brand-deep bg-brand-hover px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-white">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((transaction) => {
                const isIncome = normalizeTransactionType(String(transaction.transaction_type)) === 'INCOME'
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
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 align-middle">
                      <span className="block truncate text-sm font-medium text-neutral-900" title={transaction.description}>
                        {transaction.description}
                      </span>
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
                        <span className="text-xs italic text-neutral-300">Sin categoría</span>
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
                      <div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {/* Editar */}
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => onEdit(transaction)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-100 bg-white text-neutral-400 transition-colors hover:border-brand hover:bg-brand-light hover:text-brand-text"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Eliminar */}
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => onDelete(transaction.id)}
                          disabled={deletingId === transaction.id}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-brand-light bg-brand-light text-brand-text transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === transaction.id ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onPageSizeChange={onPageSizeChange}
      />

      <div className="flex flex-col gap-3 border-t border-neutral-100 bg-neutral-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-neutral-700">¿Quieres agregar otro movimiento?</p>
        <button
          type="button"
          className="app-btn-secondary px-3 py-1.5 text-sm"
          onClick={onCreateMovement}
        >
          + Registrar movimiento
        </button>
      </div>
    </div>
  )
}

