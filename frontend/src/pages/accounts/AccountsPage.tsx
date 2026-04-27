import { useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { accountsApi } from '@/api/accounts'
import { banksApi, type Bank } from '@/api/banks'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Select from '@/components/ui/Select'
import { useToast } from '@/hooks/useToast'
import type { Account } from '@/types'

interface AccountFormState {
  name: string
  accountType: 'savings' | 'checking'
  currency: 'COP' | 'USD'
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
  accountType: 'savings',
  currency: 'COP',
  bankId: '',
}

export default function AccountsPage() {
  const { toast } = useToast()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [savingAccount, setSavingAccount] = useState(false)

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
        if (banksResponse.data.length > 0) {
          setAccountForm((current) => ({
            ...current,
            bankId: current.bankId || String(banksResponse.data[0].id),
          }))
        }
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

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (accountForm.name.trim().length < 2) {
      toast('El nombre de la cuenta debe tener al menos 2 caracteres.', 'error')
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
      setAccountForm((current) => ({ ...current, name: '' }))
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

      <div className="grid grid-cols-1 gap-6 items-start">
        <section className="app-card p-5 border-t-4 border-t-brand">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="app-section-title text-brand-text">Crear cuenta</h2>
              <p className="text-sm text-neutral-700">Registra una nueva cuenta para empezar a mover dinero.</p>
            </div>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-1">
              <label className="app-label">Nombre de cuenta</label>
              <input
                type="text"
                value={accountForm.name}
                onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))}
                className="app-control w-full"
                placeholder="Ej: Cuenta Ahorros Principal"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="app-label">Tipo</label>
                <Select
                  value={accountForm.accountType}
                  onChange={(value) => setAccountForm((current) => ({ ...current, accountType: value as 'savings' | 'checking' }))}
                  options={[
                    { value: 'savings', label: 'Ahorros' },
                    { value: 'checking', label: 'Corriente' },
                  ]}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="app-label">Moneda</label>
                <Select
                  value={accountForm.currency}
                  onChange={(value) => setAccountForm((current) => ({ ...current, currency: value as 'COP' | 'USD' }))}
                  options={[
                    { value: 'COP', label: 'COP' },
                    { value: 'USD', label: 'USD' },
                  ]}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="app-label">Banco</label>
                <Select
                  value={accountForm.bankId}
                  onChange={(value) => setAccountForm((current) => ({ ...current, bankId: value }))}
                  options={[
                    { value: '', label: banks.length ? 'Selecciona un banco' : 'Sin bancos' },
                    ...banks.map((bank) => ({ value: String(bank.id), label: `${bank.name} (${bank.country_code})` })),
                  ]}
                  className="w-full"
                  disabled={!banks.length}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="app-btn-primary" disabled={savingAccount || !banks.length}>
                {savingAccount ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </div>
            {!banks.length && (
              <p className="text-sm text-warning-text bg-warning-bg rounded-lg px-3 py-2">
                No hay bancos disponibles. Crea bancos desde Administración.
              </p>
            )}
          </form>
        </section>
      </div>

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
    </div>
  )
}
