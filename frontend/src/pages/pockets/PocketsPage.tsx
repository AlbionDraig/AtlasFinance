import { useMemo, useState, type CSSProperties, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { AxiosError } from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { pocketsApi, type PocketPayload, type PocketUpdatePayload } from '@/api/pockets'
import type { Account, Pocket } from '@/types'
import { useToast } from '@/hooks/useToast'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import { usePocketsData } from '@/hooks/usePocketsData'
import PageSkeleton from '@/components/ui/PageSkeleton'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import EmptyState from '@/components/ui/EmptyState'
import EditButton from '@/components/ui/EditButton'
import DeleteButton from '@/components/ui/DeleteButton'
import Select from '@/components/ui/Select'
import AmountInput from '@/components/ui/AmountInput'
import InlineAlert from '@/components/ui/InlineAlert'
import PocketsFiltersCard, { type PocketFiltersState } from './components/PocketsFiltersCard'
import WithdrawFromPocketModal, { type WithdrawFromPocketFormData } from './components/WithdrawFromPocketModal'

interface PocketFormState {
  name: string
  balance: string
  account_id: string
}

const EMPTY_FORM: PocketFormState = {
  name: '',
  balance: '',
  account_id: '',
}

const DEFAULT_FILTERS: PocketFiltersState = {
  query: '',
  accountId: 'all',
  bankId: 'all',
  currency: 'all',
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  // Align backend detail extraction with the rest of UI pages.
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return fallback
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

interface AccountVisualStyle {
  accent: string
  softBg: string
  softBorder: string
  softText: string
}

const ACCOUNT_BASE_COLORS: Array<{ accent: string; softText: string; label: string }> = [
  { accent: 'var(--af-accent)', softText: 'var(--af-accent-soft-text)', label: 'Marca' },
  { accent: 'var(--af-positive)', softText: 'var(--af-positive-soft-text)', label: 'Éxito' },
  { accent: 'var(--af-warning)', softText: 'var(--af-negative-soft-text)', label: 'Advertencia' },
  { accent: 'var(--af-accent-deep)', softText: 'var(--af-accent-deep)', label: 'Profundo' },
]

function buildAccountVisualStyle(_accountId: number, index: number): AccountVisualStyle {
  // Deterministic color assignment keeps account visual identity stable.
  const base = ACCOUNT_BASE_COLORS[index % ACCOUNT_BASE_COLORS.length]
  const tier = Math.floor(index / ACCOUNT_BASE_COLORS.length)
  const tint = Math.min(14 + tier * 8, 46)
  const borderTint = Math.min(tint + 8, 58)

  return {
    accent: base.accent,
    softBg: `color-mix(in srgb, ${base.accent} ${tint}%, white)`,
    softBorder: `color-mix(in srgb, ${base.accent} ${borderTint}%, white)`,
    softText: base.softText,
  }
}

interface PocketModalProps {
  title: string
  isEditing: boolean
  form: PocketFormState
  setForm: Dispatch<SetStateAction<PocketFormState>>
  accounts: Account[]
  currentBalance?: number
  currentCurrency?: string
  saving: boolean
  submitLabel: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

function PocketModal({
  title,
  isEditing,
  form,
  setForm,
  accounts,
  currentBalance,
  currentCurrency,
  saving,
  submitLabel,
  onSubmit,
  onClose,
}: PocketModalProps) {
  const { t } = useTranslation()
  const selectedAccount = accounts.find((account) => String(account.id) === form.account_id)

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="w-full rounded-2xl bg-white border border-neutral-100 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-sm font-medium text-neutral-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label={t('common.close')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-5 py-4 space-y-4">
          <FormField label={t('pockets.field_name')}>
            <input
              className="app-control"
              type="text"
              value={form.name}
              onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
              placeholder={t('pockets.field_name_placeholder')}
              maxLength={120}
              autoFocus
            />
          </FormField>

          <FormField label={t('pockets.field_account')}>
            <Select
              value={form.account_id}
              onChange={(value) => setForm(current => ({ ...current, account_id: value }))}
              options={[
                { value: '', label: t('pockets.field_account_select') },
                ...accounts.map(account => ({
                  value: String(account.id),
                  label: `${account.name} · ${account.currency}`,
                })),
              ]}
              className="w-full"
              active={Boolean(form.account_id)}
            />
          </FormField>

          {!isEditing ? (
            <FormField label={t('pockets.field_initial_balance')}>
              <AmountInput
                value={form.balance}
                onChange={raw => setForm(current => ({ ...current, balance: raw }))}
                currency={selectedAccount?.currency ?? 'COP'}
                className="w-full"
                placeholder="0"
              />
              <InlineAlert
                className="mt-2"
                message={<>{t('pockets.initial_balance_alert')}</>}
              />
            </FormField>
          ) : (
            <FormField label={t('pockets.field_current_balance')}>
              <p className="app-control w-full min-h-10 flex items-center text-neutral-700">
                {formatCurrency(currentBalance ?? 0, currentCurrency ?? selectedAccount?.currency ?? 'COP')}
              </p>
            </FormField>
          )}

          <p className="text-xs text-neutral-400">
            {t('pockets.currency_note', { currency: selectedAccount?.currency ?? 'N/A' })}
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-50 transition-colors"
            >
              {saving ? t('pockets.submitting') : submitLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default function PocketsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState<PocketFiltersState>(DEFAULT_FILTERS)

  const { pockets, setPockets, accounts, banks, loading } = usePocketsData()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingPocket, setEditingPocket] = useState<Pocket | null>(null)
  const [deletingPocket, setDeletingPocket] = useState<Pocket | null>(null)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [form, setForm] = useState<PocketFormState>(EMPTY_FORM)

  const accountById = useMemo(() => {
    // Precompute lookup maps to avoid repeated O(n) searches in render/filter logic.
    return new Map(accounts.map(account => [account.id, account]))
  }, [accounts])

  const bankById = useMemo(() => {
    return new Map(banks.map(bank => [bank.id, bank]))
  }, [banks])

  const accountStyleById = useMemo(() => {
    const uniqueAccountIds = [...new Set(accounts.map(account => account.id))].sort((a, b) => a - b)
    return new Map(uniqueAccountIds.map((accountId, index) => [accountId, buildAccountVisualStyle(accountId, index)]))
  }, [accounts])

  const filteredPockets = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase()
    // Apply text + structured filters in a single pass for predictable ordering.
    return pockets
      .filter((pocket) => {
        const accountName = accountById.get(pocket.account_id)?.name ?? ''
        const bankName = bankById.get(accountById.get(pocket.account_id)?.bank_id ?? -1)?.name ?? ''

        if (normalizedQuery) {
          const value = [pocket.name, accountName, bankName, pocket.currency].join(' ').toLowerCase()
          if (!value.includes(normalizedQuery)) return false
        }

        if (filters.accountId !== 'all' && String(pocket.account_id) !== filters.accountId) {
          return false
        }

        if (filters.bankId !== 'all') {
          const pocketBankId = accountById.get(pocket.account_id)?.bank_id
          if (String(pocketBankId) !== filters.bankId) return false
        }

        if (filters.currency !== 'all' && pocket.currency !== filters.currency) {
          return false
        }

        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [accountById, bankById, pockets, filters])

  const activeFilters = useMemo(() => {
    const list: string[] = []
    const normalizedQuery = filters.query.trim()
    if (normalizedQuery) list.push(t('pockets.chip_search', { value: normalizedQuery }))

    if (filters.accountId !== 'all') {
      const accountName = accountById.get(Number(filters.accountId))?.name
      list.push(t('pockets.chip_account', { value: accountName ?? `#${filters.accountId}` }))
    }

    if (filters.bankId !== 'all') {
      const bankName = bankById.get(Number(filters.bankId))?.name
      list.push(t('pockets.chip_bank', { value: bankName ?? `#${filters.bankId}` }))
    }

    if (filters.currency !== 'all') {
      list.push(t('pockets.chip_currency', { value: filters.currency }))
    }

    return list
  }, [filters, accountById, bankById, t])

  function resetForm() {
    setForm(EMPTY_FORM)
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

    // Validate and normalize form state before calling API.
    if (name.length < 2) {
      toast(t('pockets.toast_name_short'), 'error')
      return null
    }
    if (!Number.isInteger(accountId) || accountId <= 0) {
      toast(t('pockets.toast_select_account'), 'error')
      return null
    }
    if (!Number.isFinite(balance) || balance < 0) {
      toast(t('pockets.toast_balance_invalid'), 'error')
      return null
    }

    const selectedAccount = accountById.get(accountId)
    if (!selectedAccount) {
      toast(t('pockets.toast_invalid_account'), 'error')
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
      toast(t('pockets.toast_name_short'), 'error')
      return null
    }
    if (!Number.isInteger(accountId) || accountId <= 0) {
      toast(t('pockets.toast_select_account'), 'error')
      return null
    }

    const selectedAccount = accountById.get(accountId)
    if (!selectedAccount) {
      toast(t('pockets.toast_invalid_account'), 'error')
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
      setPockets(current => [response.data, ...current])
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pockets })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts })
      closeCreateModal()
      toast(t('pockets.toast_created'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('pockets.toast_create_error')), 'error')
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
      setPockets(current => current.map(pocket => (pocket.id === editingPocket.id ? response.data : pocket)))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pockets })
      setEditingPocket(null)
      resetForm()
      toast(t('pockets.toast_updated'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('pockets.toast_update_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingPocket) return
    // Optimistic delete: drop from the list and close the confirm modal
    // before the network round-trip; restore from snapshot on failure.
    const target = deletingPocket
    const snapshot = pockets
    setPockets(current => current.filter(pocket => pocket.id !== target.id))
    setDeletingPocket(null)
    setSaving(true)
    try {
      await pocketsApi.delete(target.id)
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pockets })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts })
      toast(t('pockets.toast_deleted'))
    } catch (error) {
      setPockets(snapshot)
      toast(getApiErrorMessage(error, t('pockets.toast_delete_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleWithdraw(formData: WithdrawFromPocketFormData) {
    const occurredAt = `${formData.occurredDate}T${formData.occurredTime}:00`
    setSaving(true)
    try {
      await pocketsApi.withdraw({
        amount: Number(formData.amount),
        pocket_id: Number(formData.pocketId),
        occurred_at: occurredAt,
      })
      setWithdrawOpen(false)
      toast(t('pockets.toast_withdraw_ok'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pockets })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts })
    } catch (error) {
      toast(getApiErrorMessage(error, t('pockets.toast_withdraw_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <PageSkeleton cards={2} rows={5} columns={4} />
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">{t('pockets.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">
          {t('pockets.subtitle')}
        </p>
      </div>

      {createOpen && (
        <PocketModal
          title={t('pockets.create_title')}
          isEditing={false}
          form={form}
          setForm={setForm}
          accounts={accounts}
          saving={saving}
          submitLabel={t('pockets.submit_create')}
          onSubmit={handleCreate}
          onClose={closeCreateModal}
        />
      )}

      {editingPocket && (
        <PocketModal
          title={t('pockets.edit_title')}
          isEditing
          form={form}
          setForm={setForm}
          accounts={accounts}
          currentBalance={editingPocket.balance}
          currentCurrency={editingPocket.currency}
          saving={saving}
          submitLabel={t('pockets.submit_edit')}
          onSubmit={handleUpdate}
          onClose={() => {
            setEditingPocket(null)
            resetForm()
          }}
        />
      )}

      {deletingPocket && (
        <ConfirmDeleteModal
          title={t('pockets.delete_title')}
          description={t('pockets.delete_desc', { name: deletingPocket.name })}
          loading={saving}
          onConfirm={handleDelete}
          onClose={() => setDeletingPocket(null)}
        />
      )}

      {withdrawOpen && (
        <WithdrawFromPocketModal
          accounts={accounts}
          pockets={pockets}
          saving={saving}
          maxDate={new Date().toISOString().slice(0, 10)}
          onSubmit={handleWithdraw}
          onClose={() => setWithdrawOpen(false)}
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
        <div className="app-card">
          <EmptyState
            title={t('pockets.empty_no_accounts_title')}
            description={t('pockets.empty_no_accounts_desc')}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
              </svg>
            }
          />
        </div>
      ) : filteredPockets.length === 0 ? (
        <div className="app-card">
          <EmptyState
            title={pockets.length === 0 ? t('pockets.empty_no_pockets') : t('pockets.empty_no_results')}
            description={pockets.length === 0 ? t('pockets.empty_create_hint') : t('pockets.empty_filter_hint')}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPockets.map((pocket) => {
            const account = accountById.get(pocket.account_id)
            const accountStyle = accountStyleById.get(pocket.account_id)
            // Inline styles derive from account palette to reinforce visual grouping.
            const cardStyle: CSSProperties | undefined = accountStyle
              ? {
                  borderTopColor: accountStyle.accent,
                  background: `linear-gradient(180deg, ${accountStyle.softBg} 0%, #ffffff 36%)`,
                }
              : undefined

            const currencyBadgeStyle: CSSProperties | undefined = accountStyle
              ? {
                  backgroundColor: accountStyle.softBg,
                  color: accountStyle.softText,
                  borderColor: accountStyle.softBorder,
                }
              : undefined

            return (
              <article key={pocket.id} className="app-card border-t-2 p-4 space-y-3" style={cardStyle}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base text-neutral-900 font-medium">{pocket.name}</h2>
                  </div>
                  <span
                    className="rounded-full border px-3 py-1 text-xs font-medium tracking-wide shadow-sm"
                    style={currencyBadgeStyle}
                  >
                    {pocket.currency}
                  </span>
                </div>

                <div>
                  <p className="text-2xl font-medium text-neutral-900">
                    {formatCurrency(pocket.balance, pocket.currency)}
                  </p>
                  <p className="text-sm text-neutral-400 mt-1">
                    {t('pockets.card_account', { name: account?.name ?? `#${pocket.account_id}` })}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <EditButton onClick={() => prepareEdit(pocket)} />
                  <DeleteButton onClick={() => setDeletingPocket(pocket)} />
                </div>
              </article>
            )
          })}
        </div>
      )}

      <FloatingActionMenu
        hidden={createOpen || editingPocket !== null || withdrawOpen || accounts.length === 0}
        ariaLabel={t('pockets.fab_menu_label')}
        items={[
          {
            key: 'create-pocket',
            label: t('pockets.fab_create'),
            onClick: openCreateModal,
            icon: (
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            ),
          },
          {
            key: 'withdraw-pocket',
            label: t('pockets.fab_withdraw'),
            onClick: () => setWithdrawOpen(true),
            disabled: pockets.length === 0,
            icon: (
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M16 10H4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M9 7l-3 3 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  )
}
