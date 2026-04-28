import Badge from '@/components/ui/Badge'
import DeleteButton from '@/components/ui/DeleteButton'
import EditButton from '@/components/ui/EditButton'
import Pagination from '@/components/ui/Pagination'
import Tooltip from '@/components/ui/Tooltip'
import type { Bank } from '@/api/banks'
import type { Account } from '@/types'

interface AccountsTableCardProps {
  filteredAccounts: Account[]
  paginatedAccounts: Account[]
  banks: Bank[]
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  pageSize: number
  onPrevPage: () => void
  onNextPage: () => void
  onPageSizeChange: (size: number) => void
  formatCurrency: (value: number, currency: string) => string
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}

export default function AccountsTableCard({
  filteredAccounts,
  paginatedAccounts,
  banks,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  pageSize,
  onPrevPage,
  onNextPage,
  onPageSizeChange,
  formatCurrency,
  onEdit,
  onDelete,
}: AccountsTableCardProps) {
  // KPIs summarize filtered dataset, independent from pagination window.
  const savingsCount = filteredAccounts.filter((account) => account.account_type === 'savings').length
  const checkingCount = filteredAccounts.filter((account) => account.account_type === 'checking').length
  const activeBanks = new Set(filteredAccounts.map((account) => account.bank_id)).size
  const metrics = [
    {
      key: 'count',
      variant: 'neutral' as const,
      label: `${filteredAccounts.length} cuentas`,
      help: 'Total de cuentas que cumplen los filtros actuales.',
    },
    {
      key: 'savings',
      variant: 'positive' as const,
      label: `Ahorros ${savingsCount}`,
      help: 'Cantidad de cuentas de ahorro dentro del filtro activo.',
    },
    {
      key: 'checking',
      variant: 'negative' as const,
      label: `Corriente ${checkingCount}`,
      help: 'Cantidad de cuentas corrientes dentro del filtro activo.',
    },
    {
      key: 'banks',
      variant: 'neutral' as const,
      label: `Bancos ${activeBanks}`,
      help: 'Cantidad de bancos representados en las cuentas filtradas.',
    },
  ]

  return (
    <section className="app-card overflow-visible">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-100 bg-neutral-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light text-brand">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">Historial de cuentas</h2>
            <p className="text-xs text-neutral-400">
              {filteredAccounts.length
                ? `${startIndex + 1}-${endIndex} de ${filteredAccounts.length} cuentas`
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

      {!paginatedAccounts.length ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">No hay cuentas</p>
            <p className="mt-1 text-xs text-neutral-400">Ajusta los filtros o crea una nueva cuenta.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[24rem]" />
              <col className="w-40" />
              <col className="w-28" />
              <col className="w-52" />
              <col className="w-40" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">Cuenta</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">Tipo</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">Moneda</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">Banco</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">Saldo actual</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAccounts.map((account) => {
                const bank = banks.find((item) => item.id === account.bank_id)
                // Backend may expose either current_balance or legacy balance field.
                const balance = Number(account.current_balance ?? account.balance ?? 0)
                return (
                  <tr key={account.id} className="group transition-colors hover:bg-brand-light/40 odd:bg-white even:bg-neutral-50/50">
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 align-middle max-w-0">
                      <span className="block truncate text-sm font-medium text-neutral-900" title={account.name}>
                        {account.name}
                      </span>
                    </td>
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-sm text-neutral-700 align-middle">
                      {account.account_type === 'checking' ? 'Corriente' : 'Ahorros'}
                    </td>
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-sm text-neutral-700 align-middle">
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 whitespace-nowrap">
                        {account.currency}
                      </span>
                    </td>
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-sm text-neutral-700 align-middle max-w-0">
                      <span className="block truncate" title={bank?.name ?? `Banco #${account.bank_id}`}>
                        {bank?.name ?? `Banco #${account.bank_id}`}
                      </span>
                    </td>
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-right align-middle">
                      <span className="tabular-nums text-sm font-medium text-brand-deep">
                        {formatCurrency(balance, account.currency)}
                      </span>
                    </td>
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <EditButton onClick={() => onEdit(account)} label={`Editar ${account.name}`} />
                        <DeleteButton onClick={() => onDelete(account)} label={`Eliminar ${account.name}`} />
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
    </section>
  )
}
