import { useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { accountsApi } from '@/api/accounts'
import { banksApi, type Bank } from '@/api/banks'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/hooks/useToast'
import type { Account } from '@/types'
import AccountCreateModal from './components/AccountCreateModal'

interface AccountFormState {
  name: string
  accountType: 'savings' | 'checking' | ''
  currency: 'COP' | 'USD' | ''
  bankId: string
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return fallback
}

const EMPTY_ACCOUNT_FORM: AccountFormState = {
  name: '',
  accountType: '',
  currency: '',
  bankId: '',
}

export default function AccountsPage() {
  const { toast } = useToast()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [savingAccount, setSavingAccount] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const [accountForm, setAccountForm] = useState<AccountFormState>(EMPTY_ACCOUNT_FORM)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [accountsResponse, banksResponse] = await Promise.all([
          accountsApi.list(),
          banksApi.list(),
        ])
        setAccounts(accountsResponse.data)
        setBanks(banksResponse.data)
      } catch (error) {
        toast(getApiErrorMessage(error, 'No se pudieron cargar las cuentas.'), 'error')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [accounts],
  )

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

      <section className="app-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-100 bg-neutral-50 px-6 py-4">
          <div>
            <h2 className="text-sm font-medium text-neutral-900">Cuentas registradas</h2>
            <p className="text-xs text-neutral-400">{sortedAccounts.length} cuenta(s)</p>
          </div>
        </div>

        {!sortedAccounts.length ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-neutral-700">Aún no tienes cuentas registradas.</p>
            <p className="text-xs text-neutral-400 mt-1">Crea una cuenta desde el formulario superior.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">Cuenta</th>
                  <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">Tipo</th>
                  <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">Moneda</th>
                  <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">Banco</th>
                  <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-right text-xs font-medium tracking-widest uppercase text-neutral-700">Saldo actual</th>
                </tr>
              </thead>
              <tbody>
                {sortedAccounts.map((account) => {
                  const bank = banks.find((item) => item.id === account.bank_id)
                  return (
                    <tr key={account.id} className="odd:bg-white even:bg-neutral-50/50">
                      <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-sm text-neutral-900">{account.name}</td>
                      <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-sm text-neutral-700">{account.account_type === 'checking' ? 'Corriente' : 'Ahorros'}</td>
                      <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-sm text-neutral-700">{account.currency}</td>
                      <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-sm text-neutral-700">{bank?.name ?? `Banco #${account.bank_id}`}</td>
                      <td className="border-b border-r border-neutral-100 px-5 py-3.5 text-sm text-right text-brand-deep font-medium tabular-nums">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: account.currency,
                          maximumFractionDigits: 0,
                        }).format(Number(account.current_balance ?? account.balance ?? 0))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
