import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { accountsApi } from '@/api/accounts'
import { banksApi, type Bank } from '@/api/banks'
import { pocketsApi, type PocketPayload, type PocketUpdatePayload } from '@/api/pockets'
import type { Account, Pocket } from '@/types'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import PocketsFiltersCard, { type PocketFiltersState } from './components/PocketsFiltersCard'
import PocketModal, { type PocketFormState, EMPTY_POCKET_FORM } from './components/PocketModal'
import PocketCard, { buildAccountVisualStyle } from './components/PocketCard'

const DEFAULT_FILTERS: PocketFiltersState = {
  query: '',
  accountId: 'all',
  bankId: 'all',
  currency: 'all',
}

export default function PocketsPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState<PocketFiltersState>(DEFAULT_FILTERS)

  const [pockets, setPockets] = useState<Pocket[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [banks, setBanks] = useState<Bank[]>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [editingPocket, setEditingPocket] = useState<Pocket | null>(null)
  const [deletingPocket, setDeletingPocket] = useState<Pocket | null>(null)
  const [form, setForm] = useState<PocketFormState>(EMPTY_POCKET_FORM)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [pocketsResponse, accountsResponse, banksResponse] = await Promise.all([
          pocketsApi.list(),
          accountsApi.list(),
          banksApi.list(),
        ])
        setPockets(pocketsResponse.data)
        setAccounts(accountsResponse.data)
        setBanks(banksResponse.data)
      } catch (error) {
        toast(getApiErrorMessage(error, 'No se pudo cargar la informacion de bolsillos.'), 'error')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts])
  const bankById = useMemo(() => new Map(banks.map((bank) => [bank.id, bank])), [banks])

  const accountStyleById = useMemo(() => {
    const uniqueAccountIds = [...new Set(accounts.map((account) => account.id))].sort((a, b) => a - b)
    return new Map(uniqueAccountIds.map((accountId, index) => [accountId, buildAccountVisualStyle(accountId, index)]))
  }, [accounts])

  const filteredPockets = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase()
    return pockets
      .filter((pocket) => {
        const accountName = accountById.get(pocket.account_id)?.name ?? ''
        const bankName = bankById.get(accountById.get(pocket.account_id)?.bank_id ?? -1)?.name ?? ''

        if (normalizedQuery) {
          const value = [pocket.name, accountName, bankName, pocket.currency].join(' ').toLowerCase()
          if (!value.includes(normalizedQuery)) return false
        }

        if (filters.accountId !== 'all' && String(pocket.account_id) !== filters.accountId) return false

        if (filters.bankId !== 'all') {
          const pocketBankId = accountById.get(pocket.account_id)?.bank_id
          if (String(pocketBankId) !== filters.bankId) return false
        }

        if (filters.currency !== 'all' && pocket.currency !== filters.currency) return false

        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [accountById, bankById, pockets, filters])

  const activeFilters = useMemo(() => {
    const list: string[] = []
    const normalizedQuery = filters.query.trim()
    if (normalizedQuery) list.push(`Busqueda: ${normalizedQuery}`)

    if (filters.accountId !== 'all') {
      const accountName = accountById.get(Number(filters.accountId))?.name
      list.push(`Cuenta: ${accountName ?? `#${filters.accountId}`}`)
    }

    if (filters.bankId !== 'all') {
      const bankName = bankById.get(Number(filters.bankId))?.name
      list.push(`Banco: ${bankName ?? `#${filters.bankId}`}`)
    }

    if (filters.currency !== 'all') {
      list.push(`Moneda: ${filters.currency}`)
    }

    return list
  }, [filters, accountById, bankById])

  function resetForm() {
    setForm(EMPTY_POCKET_FORM)
  }

  function openCreateModal() {
    resetForm()
    setCreateOpen(true)
  }

  function closeCreateModal() {
    setCreateOpen(false)
    resetForm()
  }

  function prepareEdit(pocket: Pocket) {
    setEditingPocket(pocket)
    setForm({
      name: pocket.name,
      balance: String(pocket.balance),
      account_id: String(pocket.account_id),
    })
  }

  function buildCreatePayloadFromForm(): PocketPayload | null {
    const name = form.name.trim()
    const accountId = Number(form.account_id)
    const balance = Number(form.balance)

    if (name.length < 2) {
      toast('El nombre del bolsillo debe tener al menos 2 caracteres.', 'error')
      return null
    }
    if (!Number.isInteger(accountId) || accountId <= 0) {
      toast('Selecciona una cuenta para el bolsillo.', 'error')
      return null
    }
    if (!Number.isFinite(balance) || balance < 0) {
      toast('El saldo inicial debe ser un numero mayor o igual a 0.', 'error')
      return null
    }

    const selectedAccount = accountById.get(accountId)
    if (!selectedAccount) {
      toast('La cuenta seleccionada no es valida.', 'error')
      return null
    }

    return {
      name,
      balance,
      account_id: accountId,
      currency: selectedAccount.currency as 'COP' | 'USD',
    }
  }

  function buildUpdatePayloadFromForm(): PocketUpdatePayload | null {
    const name = form.name.trim()
    const accountId = Number(form.account_id)

    if (name.length < 2) {
      toast('El nombre del bolsillo debe tener al menos 2 caracteres.', 'error')
      return null
    }
    if (!Number.isInteger(accountId) || accountId <= 0) {
      toast('Selecciona una cuenta para el bolsillo.', 'error')
      return null
    }

    const selectedAccount = accountById.get(accountId)
    if (!selectedAccount) {
      toast('La cuenta seleccionada no es valida.', 'error')
      return null
    }

    return {
      name,
      account_id: accountId,
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = buildCreatePayloadFromForm()
    if (!payload) return

    setSaving(true)
    try {
      const response = await pocketsApi.create(payload)
      setPockets((current) => [response.data, ...current])
      closeCreateModal()
      toast('Bolsillo creado con exito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo crear el bolsillo.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingPocket) return
    const payload = buildUpdatePayloadFromForm()
    if (!payload) return

    setSaving(true)
    try {
      const response = await pocketsApi.update(editingPocket.id, payload)
      setPockets((current) => current.map((pocket) => (pocket.id === editingPocket.id ? response.data : pocket)))
      setEditingPocket(null)
      resetForm()
      toast('Bolsillo actualizado con exito.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo actualizar el bolsillo.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingPocket) return
    setSaving(true)
    try {
      await pocketsApi.delete(deletingPocket.id)
      setPockets((current) => current.filter((pocket) => pocket.id !== deletingPocket.id))
      setDeletingPocket(null)
      toast('Bolsillo eliminado.')
    } catch (error) {
      toast(getApiErrorMessage(error, 'No se pudo eliminar el bolsillo.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="app-panel p-6 flex min-h-72 items-center justify-center">
        <LoadingSpinner text="Cargando bolsillos..." />
      </div>
    )
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">Bolsillos</h1>
        <p className="app-subtitle text-sm mt-0.5">
          Asocia bolsillos a tus cuentas para separar dinero por proposito.
        </p>
      </div>

      {createOpen && (
        <PocketModal
          title="Crear bolsillo"
          isEditing={false}
          form={form}
          setForm={setForm}
          accounts={accounts}
          saving={saving}
          submitLabel="Crear bolsillo"
          onSubmit={handleCreate}
          onClose={closeCreateModal}
        />
      )}

      {editingPocket && (
        <PocketModal
          title="Editar bolsillo"
          isEditing
          form={form}
          setForm={setForm}
          accounts={accounts}
          currentBalance={editingPocket.balance}
          currentCurrency={editingPocket.currency}
          saving={saving}
          submitLabel="Guardar cambios"
          onSubmit={handleUpdate}
          onClose={() => {
            setEditingPocket(null)
            resetForm()
          }}
        />
      )}

      {deletingPocket && (
        <ConfirmDeleteModal
          title="Eliminar bolsillo"
          description={`¿Seguro que deseas eliminar el bolsillo "${deletingPocket.name}"?`}
          loading={saving}
          onConfirm={handleDelete}
          onClose={() => setDeletingPocket(null)}
        />
      )}

      <PocketsFiltersCard
        filters={filters}
        setFilters={setFilters}
        accounts={accounts}
        banks={banks}
        activeFilters={activeFilters}
        onResetFilters={() => setFilters(DEFAULT_FILTERS)}
      />

      {accounts.length === 0 ? (
        <div className="app-card p-8 text-center space-y-2">
          <p className="text-sm text-neutral-700">Necesitas crear una cuenta antes de registrar bolsillos.</p>
          <p className="text-xs text-neutral-400">Los bolsillos siempre pertenecen a una cuenta bancaria.</p>
        </div>
      ) : filteredPockets.length === 0 ? (
        <div className="app-card p-10 text-center space-y-2">
          <p className="text-sm text-neutral-700">
            {pockets.length === 0 ? 'Aun no tienes bolsillos.' : 'No hay bolsillos que coincidan con los filtros.'}
          </p>
          <p className="text-xs text-neutral-400">
            {pockets.length === 0
              ? 'Crea el primero para separar dinero por metas especificas.'
              : 'Prueba con otro termino o limpia los filtros.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPockets.map((pocket) => (
            <PocketCard
              key={pocket.id}
              pocket={pocket}
              account={accountById.get(pocket.account_id)}
              accountStyle={accountStyleById.get(pocket.account_id)}
              onEdit={prepareEdit}
              onDelete={setDeletingPocket}
            />
          ))}
        </div>
      )}

      <FloatingActionMenu
        hidden={createOpen || editingPocket !== null || accounts.length === 0}
        ariaLabel="Abrir acciones de bolsillos"
        items={[
          {
            key: 'create-pocket',
            label: 'Crear bolsillo',
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
