import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { accountsApi } from '@/api/accounts'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/hooks/useToast'
import { useAccountsList, useBanks } from '@/hooks/useAccountsData'
import { formatCurrency, getApiErrorMessage } from '@/lib/utils'
import type { Account } from '@/types'
import AccountCreateModal from './components/AccountCreateModal'
import AccountEditModal from './components/AccountEditModal'
import AccountsFiltersCard, { type AccountsFiltersState } from './components/AccountsFiltersCard'
import AccountsTableCard from './components/AccountsTableCard'

import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'

interface AccountFormState {
  name: string
  accountType: 'savings' | 'checking' | ''
  currency: 'COP' | 'USD' | ''
  bankId: string
}

const EMPTY_ACCOUNT_FORM: AccountFormState = {
  name: '',
  accountType: '',
  currency: '',
  bankId: '',
}

function buildDefaultFilters(): AccountsFiltersState {
  // Conservative defaults to keep the first render lightweight and predictable.
  return {
    query: '',
    accountType: 'all',
    currency: 'all',
    bankId: 'all',
    pageSize: 10,
  }
}

export default function AccountsPage() {
  const { toast } = useToast()
  const { t } = useTranslation()

  const [savingAccount, setSavingAccount] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [page, setPage] = useState(1)

  const [accountForm, setAccountForm] = useState<AccountFormState>(EMPTY_ACCOUNT_FORM)
  const [filters, setFilters] = useState<AccountsFiltersState>(() => buildDefaultFilters())

  // Catálogos y lista vienen de hooks dedicados (separación de responsabilidades).
  const { banks } = useBanks()
  const { accounts, setAccounts, loading } = useAccountsList(filters, () => setPage(1))

  const totalPages = Math.max(1, Math.ceil(accounts.length / filters.pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * filters.pageSize
  const endIndex = Math.min(startIndex + filters.pageSize, accounts.length)
  // Client-side pagination over already filtered server response.
  const paginatedAccounts = accounts.slice(startIndex, endIndex)
  // Human-readable filter summary used by filter card chips.
  const activeFilters = [
    filters.query.trim() ? `${t('common.search')}: ${filters.query.trim()}` : null,
    filters.accountType !== 'all' ? `${t('accounts.field_type')}: ${filters.accountType === 'checking' ? t('accounts.type_checking') : t('accounts.type_savings')}` : null,
    filters.currency !== 'all' ? `${t('common.currency')}: ${filters.currency}` : null,
    filters.bankId !== 'all'
      ? `${t('common.bank')}: ${banks.find((bank) => String(bank.id) === filters.bankId)?.name ?? `${t('common.bank')} #${filters.bankId}`}`
      : null,
  ].filter(Boolean) as string[]

  function resetAccountForm() {
    setAccountForm(EMPTY_ACCOUNT_FORM)
  }

  function openCreateModal() {
    resetAccountForm()
    setCreateOpen(true)
  }

  function closeCreateModal() {
    setCreateOpen(false)
    resetAccountForm()
  }

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Keep validation in UI to provide immediate feedback before API call.
    if (accountForm.name.trim().length < 2) {
      toast(t('accounts.toast_name_short'), 'error')
      return
    }
    if (!accountForm.accountType) {
      toast(t('accounts.toast_select_type'), 'error')
      return
    }
    if (!accountForm.currency) {
      toast(t('accounts.toast_select_currency'), 'error')
      return
    }
    if (!accountForm.bankId) {
      toast(t('accounts.toast_select_bank'), 'error')
      return
    }

    setSavingAccount(true)
    try {
      const response = await accountsApi.create({
        name: accountForm.name.trim(),
        account_type: accountForm.accountType,
        currency: accountForm.currency,
        current_balance: 0,
        bank_id: Number(accountForm.bankId),
      })
      setAccounts((current) => [response.data, ...current])
      closeCreateModal()
      toast(t('accounts.toast_created'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('accounts.toast_create_error')), 'error')
    } finally {
      setSavingAccount(false)
    }
  }

  async function handleEditAccount(
    id: number,
    data: { name: string; account_type: 'savings' | 'checking'; currency: 'COP' | 'USD'; bank_id: number },
  ) {
    setSavingAccount(true)
    try {
      const response = await accountsApi.update(id, data)
      setAccounts((current) => current.map((acc) => (acc.id === id ? response.data : acc)))
      setEditingAccount(null)
      toast(t('accounts.toast_updated'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('accounts.toast_update_error')), 'error')
    } finally {
      setSavingAccount(false)
    }
  }

  async function handleDeleteAccount() {
    if (!deletingAccount) return
    setSavingAccount(true)
    try {
      await accountsApi.delete(deletingAccount.id)
      setAccounts((current) => current.filter((acc) => acc.id !== deletingAccount.id))
      setDeletingAccount(null)
      toast(t('accounts.toast_deleted'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('accounts.toast_delete_error')), 'error')
    } finally {
      setSavingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="app-panel p-6 flex min-h-72 items-center justify-center">
        <LoadingSpinner text={t('accounts.loading')} />
      </div>
    )
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">{t('accounts.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">{t('accounts.subtitle')}</p>
      </div>

      {createOpen && (
        <AccountCreateModal
          form={accountForm}
          setForm={setAccountForm}
          banks={banks}
          saving={savingAccount}
          onSubmit={handleCreateAccount}
          onClose={closeCreateModal}
        />
      )}

      {editingAccount && (
        <AccountEditModal
          account={editingAccount}
          banks={banks}
          saving={savingAccount}
          onSubmit={handleEditAccount}
          onClose={() => setEditingAccount(null)}
        />
      )}

      {deletingAccount && (
        <ConfirmDeleteModal
          title={t('accounts.delete_title')}
          description={t('accounts.delete_desc', { name: deletingAccount.name })}
          loading={savingAccount}
          onConfirm={handleDeleteAccount}
          onClose={() => setDeletingAccount(null)}
        />
      )}

      <AccountsFiltersCard
        filters={filters}
        setFilters={setFilters}
        banks={banks}
        activeFilters={activeFilters}
        onResetFilters={() => setFilters(buildDefaultFilters())}
      />

      <AccountsTableCard
        filteredAccounts={accounts}
        paginatedAccounts={paginatedAccounts}
        banks={banks}
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        pageSize={filters.pageSize}
        onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setPage((current) => Math.min(totalPages, current + 1))}
        onPageSizeChange={(size) => setFilters((current) => ({ ...current, pageSize: size }))}
        formatCurrency={formatCurrency}
        onEdit={setEditingAccount}
        onDelete={setDeletingAccount}
      />

      <FloatingActionMenu
        hidden={createOpen}
        ariaLabel={t('transactions.fab_menu_label')}
        items={[
          {
            key: 'create-account',
            label: t('accounts.fab_create'),
            onClick: openCreateModal,
            icon: (
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  )
}
