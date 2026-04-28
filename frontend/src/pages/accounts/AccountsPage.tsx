import { useEffect, useState } from 'react'
import { accountsApi } from '@/api/accounts'
import { banksApi, type Bank } from '@/api/banks'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/hooks/useToast'
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

  const [accounts, setAccounts] = useState<Account[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [savingAccount, setSavingAccount] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [page, setPage] = useState(1)

  const [accountForm, setAccountForm] = useState<AccountFormState>(EMPTY_ACCOUNT_FORM)
  const [filters, setFilters] = useState<AccountsFiltersState>(() => buildDefaultFilters())

  // Load banks once on mount
  useEffect(() => {
    banksApi.list()
      .then((res) => setBanks(res.data))
      .catch((error) => toast(getApiErrorMessage(error, 'No se pudieron cargar los bancos.'), 'error'))
  }, [])

  // Reload accounts from server whenever filters change (debounce query text)
  useEffect(() => {
    let cancelled = false
    const delayMs = filters.query.trim() ? 350 : 0

    const timer = setTimeout(() => {
      setLoading(true)
      accountsApi.list({
        search: filters.query.trim() || undefined,
        account_type: filters.accountType !== 'all' ? (filters.accountType as 'savings' | 'checking') : undefined,
        currency: filters.currency !== 'all' ? (filters.currency as 'COP' | 'USD') : undefined,
        bank_id: filters.bankId !== 'all' ? Number(filters.bankId) : undefined,
      })
        .then((res) => { if (!cancelled) { setAccounts(res.data); setPage(1) } })
        .catch((error) => { if (!cancelled) toast(getApiErrorMessage(error, 'No se pudieron cargar las cuentas.'), 'error') })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, delayMs)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [filters.query, filters.accountType, filters.currency, filters.bankId])

  const totalPages = Math.max(1, Math.ceil(accounts.length / filters.pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * filters.pageSize
  const endIndex = Math.min(startIndex + filters.pageSize, accounts.length)
  const paginatedAccounts = accounts.slice(startIndex, endIndex)
  const activeFilters = [
    filters.query.trim() ? `Búsqueda: ${filters.query.trim()}` : null,
    filters.accountType !== 'all' ? `Tipo: ${filters.accountType === 'checking' ? 'Corriente' : 'Ahorros'}` : null,
    filters.currency !== 'all' ? `Moneda: ${filters.currency}` : null,
    filters.bankId !== 'all'
      ? `Banco: ${banks.find((bank) => String(bank.id) === filters.bankId)?.name ?? `Banco #${filters.bankId}`}`
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

    if (accountForm.name.trim().length < 2) {
      toast('El nombre de la cuenta debe tener al menos 2 caracteres.', 'error')
      return
    }
    if (!accountForm.accountType) {
      toast('Selecciona el tipo de cuenta.', 'error')
      return
    }
    if (!accountForm.currency) {
      toast('Selecciona la moneda de la cuenta.', 'error')
      return
    }
    if (!accountForm.bankId) {
      toast('Selecciona un banco para crear la cuenta.', 'error')
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
      toast('Cuenta creada con éxito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo crear la cuenta.'), 'error')
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
      toast('Cuenta actualizada con éxito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo actualizar la cuenta.'), 'error')
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
      toast('Cuenta eliminada.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo eliminar la cuenta.'), 'error')
    } finally {
      setSavingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="app-panel p-6 flex min-h-72 items-center justify-center">
        <LoadingSpinner text="Cargando cuentas..." />
      </div>
    )
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">Cuentas</h1>
        <p className="app-subtitle text-sm mt-0.5">Crea y administra tus cuentas bancarias.</p>
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
          title="Eliminar cuenta"
          description={`¿Seguro que deseas eliminar la cuenta "${deletingAccount.name}"? Esta acción no se puede deshacer.`}
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
        ariaLabel="Abrir acciones de cuentas"
        items={[
          {
            key: 'create-account',
            label: 'Crear cuenta',
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
