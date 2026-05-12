import { useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { pocketsApi } from '@/api/pockets'
import type { Account, Pocket } from '@/types'
import { useToast } from '@/hooks/useToast'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import { formatCurrency, getApiErrorMessage } from '@/lib/utils'
import { usePocketsData } from '@/hooks/usePocketsData'
import PageSkeleton from '@/components/ui/PageSkeleton'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import EmptyState from '@/components/ui/EmptyState'
import EditButton from '@/components/ui/EditButton'
import DeleteButton from '@/components/ui/DeleteButton'
import TableActionGroup from '@/components/ui/TableActionGroup'
import Select from '@/components/ui/Select'
import AmountInput from '@/components/ui/AmountInput'
import InlineAlert from '@/components/ui/InlineAlert'
import ViewToggle from '@/components/ui/ViewToggle'
import PocketsFiltersCard from './components/PocketsFiltersCard'
import WithdrawFromPocketModal, { type WithdrawFromPocketFormData } from './components/WithdrawFromPocketModal'
import EntityCard from '@/components/ui/EntityCard'
import {
  type PocketFormErrors,
  type PocketFormState,
} from './pocketPayload'
import { usePocketForm } from './hooks/usePocketForm'
import { usePocketsFilters } from './hooks/usePocketsFilters'

const UNDO_WINDOW_MS = 5000

// ── KPI card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string
  accent: 'brand' | 'success' | 'warning'
  icon?: ReactNode
}
function KpiCard({ label, value, accent, icon }: KpiCardProps) {
  const accentStyles = {
    brand: { line: 'bg-brand', ring: 'ring-brand/15', glow: 'bg-brand/10', icon: 'bg-brand-light text-brand' },
    success: { line: 'bg-success', ring: 'ring-success/15', glow: 'bg-success/10', icon: 'bg-success-bg text-success' },
    warning: { line: 'bg-warning', ring: 'ring-warning/15', glow: 'bg-warning/10', icon: 'bg-warning-bg text-warning' },
  }[accent]

  return (
    <div className={`relative overflow-hidden rounded-xl border border-neutral-100 bg-gradient-to-b from-white to-neutral-50/80 p-4 shadow-sm ring-1 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md ${accentStyles.ring}`}>
      <div className={`absolute inset-x-0 top-0 h-1.5 ${accentStyles.line}`} />
      <div className={`absolute -right-8 -top-8 h-20 w-20 rounded-full blur-2xl ${accentStyles.glow}`} aria-hidden="true" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-neutral-700">{label}</p>
        {icon && (
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${accentStyles.icon}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-[1.7rem] font-medium tracking-tight text-neutral-900">{value}</p>
    </div>
  )
}

interface PocketModalProps {
  title: string
  isEditing: boolean
  form: PocketFormState
  errors: PocketFormErrors
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
  errors,
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
      <div className="w-full rounded-2xl border border-neutral-100 border-t-4 border-t-brand bg-white shadow-xl overflow-visible">
        <div className="flex items-center justify-between border-b border-brand/10 bg-brand-light px-6 py-4">
          <div className="flex items-start gap-3 w-full">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
              {isEditing ? (
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
                  <path d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5zM15.71 6.29a1 1 0 000-1.41l-1.58-1.58a1 1 0 00-1.41 0l-1.24 1.24 2.99 2.99 1.24-1.24z" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="app-section-title text-brand-text">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto -mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              aria-label={t('common.close')}
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <FormField label={t('pockets.field_name')}>
            <input
              className={`app-control ${errors.name ? 'border-warning' : ''}`}
              type="text"
              value={form.name}
              onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
              placeholder={t('pockets.field_name_placeholder')}
              maxLength={120}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs tone-negative">{errors.name}</p>}
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
            {errors.account_id && <p className="mt-1 text-xs tone-negative">{errors.account_id}</p>}
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
              {errors.balance && <p className="mt-1 text-xs tone-negative">{errors.balance}</p>}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="app-btn-primary"
            >
              {saving ? t('pockets.submitting') : submitLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="app-btn-secondary"
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const { pockets, setPockets, accounts, banks, loading } = usePocketsData()

  const [deletingPocket, setDeletingPocket] = useState<Pocket | null>(null)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const pendingDeleteTimeoutsRef = useRef<Map<number, number>>(new Map())

  const {
    filters,
    setFilters,
    resetFilters,
    accountById,
    bankById,
    accountStyleById,
    filteredPockets,
    activeFilters,
    totalCOP,
    totalUSD,
  } = usePocketsFilters({
    pockets,
    accounts,
    banks,
    t,
  })

  const {
    createOpen,
    editingPocket,
    closeEditModal,
    form,
    setForm,
    formErrors,
    openCreateModal,
    closeCreateModal,
    prepareEdit,
    buildCreatePayloadFromForm,
    buildUpdatePayloadFromForm,
  } = usePocketForm({
    accountById,
    onValidationError: (message) => toast(message, 'error'),
  })

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
      closeEditModal()
      toast(t('pockets.toast_updated'))
    } catch (error) {
      toast(getApiErrorMessage(error, t('pockets.toast_update_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingPocket) return
    const target = deletingPocket
    const previousIndex = pockets.findIndex((pocket) => pocket.id === target.id)
    setPockets(current => current.filter(pocket => pocket.id !== target.id))
    setDeletingPocket(null)

    const timeoutId = window.setTimeout(async () => {
      pendingDeleteTimeoutsRef.current.delete(target.id)
      try {
        await pocketsApi.delete(target.id)
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pockets })
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts })
      } catch (error) {
        setPockets((current) => {
          if (current.some((pocket) => pocket.id === target.id)) return current
          const next = [...current]
          const index = previousIndex >= 0 ? Math.min(previousIndex, next.length) : next.length
          next.splice(index, 0, target)
          return next
        })
        toast(getApiErrorMessage(error, t('pockets.toast_delete_error')), 'error')
      }
    }, UNDO_WINDOW_MS)

    pendingDeleteTimeoutsRef.current.set(target.id, timeoutId)
    toast(t('pockets.toast_deleted'), 'success', {
      actionLabel: t('common.undo'),
      onAction: () => {
        const pendingTimeoutId = pendingDeleteTimeoutsRef.current.get(target.id)
        if (pendingTimeoutId != null) {
          window.clearTimeout(pendingTimeoutId)
          pendingDeleteTimeoutsRef.current.delete(target.id)
          setPockets((current) => {
            if (current.some((pocket) => pocket.id === target.id)) return current
            const next = [...current]
            const index = previousIndex >= 0 ? Math.min(previousIndex, next.length) : next.length
            next.splice(index, 0, target)
            return next
          })
        }
      },
    })
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

      {pockets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label={t('pockets.kpi_count')}
            value={String(filteredPockets.length)}
            accent="brand"
            icon={
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
                <path d="M3 6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M13 10a1 1 0 11-2 0 1 1 0 012 0z" fill="currentColor" />
              </svg>
            }
          />
          <KpiCard
            label={t('pockets.kpi_cop')}
            value={formatCurrency(totalCOP, 'COP')}
            accent="success"
            icon={
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
                <path d="M10 2v16M5 7l5-5 5 5M5 17h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <KpiCard
            label={t('pockets.kpi_usd')}
            value={formatCurrency(totalUSD, 'USD')}
            accent="warning"
            icon={
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
                <path d="M10 3v14M7 6.5C7 5.12 8.34 4 10 4s3 1.12 3 2.5S11.66 9 10 9s-3 1.12-3 2.5S8.34 14 10 14s3-1.12 3-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
          />
        </div>
      )}

      {createOpen && (
        <PocketModal
          title={t('pockets.create_title')}
          isEditing={false}
          form={form}
          errors={formErrors}
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
          errors={formErrors}
          setForm={setForm}
          accounts={accounts}
          currentBalance={editingPocket.balance}
          currentCurrency={editingPocket.currency}
          saving={saving}
          submitLabel={t('pockets.submit_edit')}
          onSubmit={handleUpdate}
          onClose={closeEditModal}
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
        onResetFilters={resetFilters}
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
            action={(
              <Link to="/accounts" className="app-btn-primary">
                {t('accounts.fab_create')}
              </Link>
            )}
          />
        </div>
      ) : filteredPockets.length === 0 ? (
        <div className="app-card">
          <EmptyState
            title={pockets.length === 0 ? t('pockets.empty_no_pockets') : t('pockets.empty_no_results')}
            description={pockets.length === 0 ? t('pockets.empty_create_hint') : t('pockets.empty_filter_hint')}
            action={pockets.length === 0 ? (
              <button type="button" className="app-btn-primary" onClick={openCreateModal}>
                {t('pockets.fab_create')}
              </button>
            ) : (
              <button type="button" className="app-btn-secondary" onClick={resetFilters}>
                {t('common.clearFilters')}
              </button>
            )}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Toggle de vista */}
          <div className="flex justify-end">
            <ViewToggle value={viewMode} onChange={(m) => setViewMode(m as 'cards' | 'table')} />
          </div>

          {viewMode === 'cards' ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPockets.map((pocket) => {
                const account = accountById.get(pocket.account_id)
                const bankName = bankById.get(account?.bank_id ?? -1)?.name
                const accountStyle = accountStyleById.get(pocket.account_id)

                const accentStyle = accountStyle
                  ? {
                      accentColor: accountStyle.accent,
                      badgeBg: accountStyle.softBg,
                      badgeText: accountStyle.softText,
                      badgeBorder: accountStyle.softBorder,
                    }
                  : undefined

                return (
                  <EntityCard
                    key={pocket.id}
                    title={pocket.name}
                    badge={pocket.currency}
                    value={formatCurrency(pocket.balance, pocket.currency)}
                    footerLabel={[bankName, account?.name ?? `#${pocket.account_id}`].filter(Boolean).join(' · ')}
                    accentStyle={accentStyle}
                    actions={
                      <>
                        <EditButton onClick={() => prepareEdit(pocket)} />
                        <DeleteButton onClick={() => setDeletingPocket(pocket)} />
                      </>
                    }
                  />
                )
              })}
            </div>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table table-fixed text-sm">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[22%]" />
                  <col className="w-[18%]" />
                  <col className="w-[9%]" />
                  <col className="w-[15%]" />
                  <col className="w-[6%]" />
                </colgroup>
                <thead className="border-b border-brand/30 bg-brand text-xs text-white">
                  <tr className="align-middle">
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('pockets.table_name')}</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('pockets.table_account')}</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('pockets.table_bank')}</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('pockets.table_currency')}</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('pockets.table_balance')}</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('pockets.table_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPockets.map((pocket, index) => {
                    const account = accountById.get(pocket.account_id)
                    const bankName = bankById.get(account?.bank_id ?? -1)?.name
                    const accountStyle = accountStyleById.get(pocket.account_id)
                    const accentColor = accountStyle?.accent

                    return (
                      <tr
                        key={pocket.id}
                        className={`border-b border-neutral-100 last:border-b-0 transition-colors hover:bg-brand-light/35 ${index % 2 === 0 ? 'bg-white' : 'bg-brand-light/10'}`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {accentColor && (
                              <span className="shrink-0 w-1.5 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
                            )}
                            <span className="font-medium text-neutral-900">{pocket.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-neutral-700">{account?.name ?? `#${pocket.account_id}`}</td>
                        <td className="px-3 py-2 text-neutral-500">{bankName ?? '—'}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-center align-middle">
                          <span className="mx-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wider text-neutral-600 bg-neutral-50">
                            {pocket.currency}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-neutral-900 tabular-nums">
                          {formatCurrency(pocket.balance, pocket.currency)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-center align-middle">
                          <TableActionGroup>
                            <EditButton onClick={() => prepareEdit(pocket)} />
                            <DeleteButton onClick={() => setDeletingPocket(pocket)} />
                          </TableActionGroup>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
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
