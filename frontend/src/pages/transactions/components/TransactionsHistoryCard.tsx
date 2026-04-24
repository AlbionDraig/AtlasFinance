import type { Category } from '@/api/categories'
import type { Account, Transaction } from '@/types'

interface TransactionsHistoryCardProps {
  filteredTransactions: Transaction[]
  paginatedTransactions: Transaction[]
  startIndex: number
  currentPage: number
  totalPages: number
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
}

export default function TransactionsHistoryCard({
  filteredTransactions,
  paginatedTransactions,
  startIndex,
  currentPage,
  totalPages,
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
}: TransactionsHistoryCardProps) {
  return (
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
            onClick={onPrevPage}
            disabled={currentPage === 1}
          >Anterior</button>
          <button
            type="button"
            className="app-btn-secondary !w-auto px-4 py-2"
            onClick={onNextPage}
            disabled={currentPage === totalPages}
          >Siguiente</button>
        </div>
      </div>

      {!paginatedTransactions.length ? (
        <div className="px-5 py-10 text-center">
          <p className="app-title text-lg">No hay movimientos que coincidan con los filtros.</p>
          <p className="app-subtitle mt-2">Ajusta el periodo, cambia la busqueda o registra un nuevo movimiento.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--af-border)]">
            <thead className="bg-[var(--af-bg-soft)]">
              <tr>
                <th className="px-5 py-3 text-left app-label">Fecha</th>
                <th className="px-5 py-3 text-left app-label">Descripcion</th>
                <th className="px-5 py-3 text-left app-label">Tipo</th>
                <th className="px-5 py-3 text-left app-label">Moneda</th>
                <th className="px-5 py-3 text-left app-label">Cuenta</th>
                <th className="px-5 py-3 text-left app-label">Categoria</th>
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
                        <button type="button" className="app-btn-secondary !w-auto px-3 py-2" onClick={() => onEdit(transaction)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="max-w-max rounded-lg border border-[var(--af-accent-soft)] bg-[var(--af-accent-soft)] px-3 py-2 text-sm font-medium text-[var(--af-accent-soft-text)] transition-colors hover:bg-[var(--af-accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => onDelete(transaction.id)}
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
          <p className="app-subtitle text-sm">Pagina {currentPage} de {totalPages}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="app-btn-secondary !w-auto px-4 py-2"
              onClick={onPrevPage}
              disabled={currentPage === 1}
            >←</button>
            <button
              type="button"
              className="app-btn-secondary !w-auto px-4 py-2"
              onClick={onNextPage}
              disabled={currentPage === totalPages}
            >→</button>
          </div>
        </div>
      )}
    </div>
  )
}
