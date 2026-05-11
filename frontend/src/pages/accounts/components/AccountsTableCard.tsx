import Badge from '@/components/ui/Badge'
import { useTranslation } from 'react-i18next'
import DeleteButton from '@/components/ui/DeleteButton'
import EditButton from '@/components/ui/EditButton'
import Pagination from '@/components/ui/Pagination'
import TableActionGroup from '@/components/ui/TableActionGroup'
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
  onCreate?: () => void
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
  onCreate,
}: AccountsTableCardProps) {
  const { t } = useTranslation()
  // KPIs summarize filtered dataset, independent from pagination window.
  const savingsCount = filteredAccounts.filter((account) => account.account_type === 'savings').length
  const checkingCount = filteredAccounts.filter((account) => account.account_type === 'checking').length
  const activeBanks = new Set(filteredAccounts.map((account) => account.bank_id)).size
  const metrics = [
    {
      key: 'count',
      variant: 'neutral' as const,
      label: t('accounts.metric_total', { count: filteredAccounts.length }),
      help: t('accounts.metric_total_help'),
    },
    {
      key: 'savings',
      variant: 'positive' as const,
      label: t('accounts.metric_savings', { count: savingsCount }),
      help: t('accounts.metric_savings_help'),
    },
    {
      key: 'checking',
      variant: 'negative' as const,
      label: t('accounts.metric_checking', { count: checkingCount }),
      help: t('accounts.metric_checking_help'),
    },
    {
      key: 'banks',
      variant: 'neutral' as const,
      label: t('accounts.metric_banks', { count: activeBanks }),
      help: t('accounts.metric_banks_help'),
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
            <h2 className="text-sm font-medium text-neutral-900">{t('accounts.table_title')}</h2>
            <p className="text-xs text-neutral-400">
              {filteredAccounts.length
                ? `${startIndex + 1}-${endIndex} ${t('common.of')} ${filteredAccounts.length} ${t('accounts.filter_bank_all')}`
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

      {!paginatedAccounts.length ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">{t('accounts.table_empty_title')}</p>
            <p className="mt-1 text-xs text-neutral-400">{t('accounts.table_empty_desc')}</p>
          </div>
          {onCreate && filteredAccounts.length === 0 && (
            <button type="button" className="app-btn-primary" onClick={onCreate}>
              {t('accounts.fab_create')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3 p-4 md:hidden">
            {paginatedAccounts.map((account) => {
              const bank = banks.find((item) => item.id === account.bank_id)
              const balance = Number(account.current_balance ?? account.balance ?? 0)
              return (
                <article key={account.id} className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{account.name}</p>
                      <p className="mt-1 text-xs text-neutral-400">{bank?.name ?? `Banco #${account.bank_id}`}</p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-700">
                      {account.currency}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-700">
                    <p>{t('accounts.table_col_type')}</p>
                    <p className="text-right">
                      {account.account_type === 'checking' ? t('accounts.type_checking') : t('accounts.type_savings')}
                    </p>
                    <p>{t('accounts.table_col_balance')}</p>
                    <p className="text-right font-medium text-brand-deep">{formatCurrency(balance, account.currency)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-neutral-100 pt-3">
                    <EditButton onClick={() => onEdit(account)} label={t('common.edit_item', { name: account.name })} />
                    <DeleteButton onClick={() => onDelete(account)} label={t('common.delete_item', { name: account.name })} />
                  </div>
                </article>
              )
            })}
          </div>
          <div className="hidden md:block app-table-wrap">
          <table className="app-table table-fixed">
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
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center align-middle text-xs font-medium tracking-widest uppercase text-neutral-700">{t('accounts.table_col_account')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center align-middle text-xs font-medium tracking-widest uppercase text-neutral-700">{t('accounts.table_col_type')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center align-middle text-xs font-medium tracking-widest uppercase text-neutral-700">{t('accounts.table_col_currency')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center align-middle text-xs font-medium tracking-widest uppercase text-neutral-700">{t('accounts.table_col_bank')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center align-middle text-xs font-medium tracking-widest uppercase text-neutral-700">{t('accounts.table_col_balance')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center align-middle text-xs font-medium tracking-widest uppercase text-neutral-700">{t('accounts.table_col_actions')}</th>
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
                      {account.account_type === 'checking' ? t('accounts.type_checking') : t('accounts.type_savings')}
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
                    <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-center align-middle">
                      <TableActionGroup>
                        <EditButton onClick={() => onEdit(account)} label={t('common.edit_item', { name: account.name })} />
                        <DeleteButton onClick={() => onDelete(account)} label={t('common.delete_item', { name: account.name })} />
                      </TableActionGroup>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
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
