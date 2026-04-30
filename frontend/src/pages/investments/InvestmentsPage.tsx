import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { AxiosError } from 'axios'
import { type InvestmentEntity } from '@/api/investmentEntities'
import { investmentsApi, INSTRUMENT_TYPES, type InvestmentPayload, type InvestmentUpdatePayload } from '@/api/investments'
import type { Investment } from '@/types'
import { useToast } from '@/hooks/useToast'
import { useInvestmentsData } from '@/hooks/useInvestmentsData'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import FilterCard from '@/components/ui/FilterCard'
import SearchInput from '@/components/ui/SearchInput'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import EmptyState from '@/components/ui/EmptyState'
import EditButton from '@/components/ui/EditButton'
import DeleteButton from '@/components/ui/DeleteButton'
import Select from '@/components/ui/Select'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'

function formatCurrency(value: number, currency: string): string {
  // Reuse localized formatting to keep financial values consistent across cards.
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

const INSTRUMENT_COLORS: Record<string, { bg: string; text: string }> = {
  Acciones: { bg: 'bg-brand-light', text: 'text-brand-text' },
  Fondos:   { bg: 'bg-success-bg', text: 'text-success-text' },
  Bonos:    { bg: 'bg-warning-bg', text: 'text-warning-text' },
  CDT:      { bg: 'bg-neutral-100', text: 'text-neutral-700' },
  ETF:      { bg: 'bg-brand-light', text: 'text-brand-text' },
  Cripto:   { bg: 'bg-warning-bg', text: 'text-warning-text' },
  Otro:     { bg: 'bg-neutral-100', text: 'text-neutral-700' },
}

function instrumentBadge(type: string) {
  const style = INSTRUMENT_COLORS[type] ?? { bg: 'bg-neutral-100', text: 'text-neutral-700' }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {type}
    </span>
  )
}

interface InvestmentFormState {
  name: string
  instrument_type: string
  amount_invested: string
  current_value: string
  currency: string
  investment_entity_id: string
  started_at: string
}

function emptyForm(): InvestmentFormState {
  // Default to current day and COP for faster data entry in local context.
  return {
    name: '',
    instrument_type: INSTRUMENT_TYPES[0],
    amount_invested: '',
    current_value: '',
    currency: 'COP',
    investment_entity_id: '',
    started_at: new Date().toISOString().slice(0, 10),
  }
}

interface InvestmentModalProps {
  title: string
  isEditing: boolean
  form: InvestmentFormState
  setForm: Dispatch<SetStateAction<InvestmentFormState>>
  entities: InvestmentEntity[]
  saving: boolean
  submitLabel: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

function InvestmentModal({
  title, isEditing, form, setForm, entities, saving, submitLabel, onSubmit, onClose,
}: InvestmentModalProps) {
  const { t } = useTranslation()
  const entityOptions = [
    { value: '', label: t('investments.field_entity_select') },
    ...entities.map(entity => ({ value: String(entity.id), label: entity.name })),
  ]
  const instrumentOptions = INSTRUMENT_TYPES.map(type => ({ value: type, label: type }))
  const currencyOptions = [
    { value: 'COP', label: 'COP' },
    { value: 'USD', label: 'USD' },
  ]

  return (
    <Modal onClose={onClose} maxWidth="max-w-xl">
      <div className="w-full rounded-2xl border border-neutral-100 border-t-4 border-t-brand bg-white shadow-xl overflow-visible">
        <div className="flex items-start gap-3 border-b border-brand/10 bg-brand-light px-6 py-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="app-section-title text-brand-text">{title}</h2>
            <p className="mt-0.5 text-sm text-neutral-700">
              {isEditing ? t('investments.edit_desc') : t('investments.create_desc')}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('common.close')}
            className="ml-auto -mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div className="space-y-1">
            <label className="app-label">{t('investments.field_name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(c => ({ ...c, name: e.target.value }))}
              className="app-control w-full"
              placeholder={t('investments.field_name_placeholder')}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="app-label">{t('investments.field_instrument')}</label>
              <Select
                value={form.instrument_type}
                onChange={v => setForm(c => ({ ...c, instrument_type: v }))}
                options={instrumentOptions}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="app-label">{t('investments.field_entity')}</label>
              <Select
                value={form.investment_entity_id}
                onChange={v => setForm(c => ({ ...c, investment_entity_id: v }))}
                options={entityOptions}
                className="w-full"
              />
            </div>
          </div>

          {isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="app-label">{t('investments.field_invested')}</label>
                <p className="app-control w-full min-h-10 flex items-center text-neutral-700">
                  {form.amount_invested ? formatCurrency(Number(form.amount_invested), form.currency) : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="app-label">{t('investments.field_current_value')}</label>
                <AmountInput
                  value={form.current_value}
                  onChange={raw => setForm(c => ({ ...c, current_value: raw }))}
                  currency={form.currency || 'COP'}
                  className="w-full"
                  placeholder="0"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="app-label">{t('investments.field_invested')}</label>
              <AmountInput
                value={form.amount_invested}
                onChange={raw => setForm(c => ({ ...c, amount_invested: raw }))}
                currency={form.currency || 'COP'}
                className="w-full"
                placeholder="0"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="app-label">{t('investments.field_currency')}</label>
              {isEditing ? (
                <p className="app-control w-full min-h-10 flex items-center text-neutral-700">{form.currency}</p>
              ) : (
                <Select
                  value={form.currency}
                  onChange={v => setForm(c => ({ ...c, currency: v }))}
                  options={currencyOptions}
                  className="w-full"
                />
              )}
            </div>
            <DatePicker
              label={t('investments.field_start_date')}
              value={form.started_at}
              onChange={v => setForm(c => ({ ...c, started_at: v }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <button type="submit" className="app-btn-primary" disabled={saving}>
              {saving ? t('common.saving') : submitLabel}
            </button>
            <button type="button" className="app-btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string
  accent: string
  sub?: string
  subColor?: string
}
function KpiCard({ label, value, accent, sub, subColor }: KpiCardProps) {
  return (
    <div className={`bg-white border border-neutral-100 rounded-xl p-4 ${accent}`}>
      <p className="text-xs font-medium tracking-widest uppercase text-neutral-700">{label}</p>
      <p className="text-2xl font-medium text-neutral-900 mt-1">{value}</p>
      {sub && <p className={`text-sm mt-0.5 ${subColor ?? 'text-neutral-400'}`}>{sub}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InvestmentsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const { investments, setInvestments, entities, loading } = useInvestmentsData()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<InvestmentFormState>(emptyForm())

  // Filters
  const [filterQuery, setFilterQuery] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCurrency, setFilterCurrency] = useState('')

  const entityById = useMemo(() => new Map(entities.map(entity => [entity.id, entity])), [entities])

  const filtered = useMemo(() => investments.filter(inv => {
    // All selected filters are conjunctive (AND) to avoid ambiguous result sets.
    if (filterQuery) {
      const q = filterQuery.toLowerCase()
      const entity = entityById.get(inv.investment_entity_id)
      if (!inv.name.toLowerCase().includes(q) && !(entity?.name ?? '').toLowerCase().includes(q)) return false
    }
    if (filterEntity && String(inv.investment_entity_id) !== filterEntity) return false
    if (filterType && inv.instrument_type !== filterType) return false
    if (filterCurrency && inv.currency !== filterCurrency) return false
    return true
  }), [investments, filterQuery, filterEntity, filterType, filterCurrency, entityById])

  const totalInvested = useMemo(() =>
    filtered.reduce((sum, inv) => sum + inv.amount_invested, 0), [filtered])
  const totalCurrent = useMemo(() =>
    filtered.reduce((sum, inv) => sum + inv.current_value, 0), [filtered])
  // Derived KPIs shown in summary cards.
  const totalGain = totalCurrent - totalInvested
  const returnPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : '0.0'
  const gainPositive = totalGain >= 0

  const hasFilters = filterQuery || filterEntity || filterType || filterCurrency
  const activeFilters = [
    filterQuery && `"${filterQuery}"`,
    filterEntity && (entityById.get(Number(filterEntity))?.name ?? ''),
    filterType || '',
    filterCurrency || '',
  ].filter(Boolean) as string[]

  function openCreate() {
    setForm(emptyForm())
    setCreateOpen(true)
  }

  function openEdit(inv: Investment) {
    setForm({
      name: inv.name,
      instrument_type: inv.instrument_type,
      amount_invested: String(inv.amount_invested),
      current_value: String(inv.current_value),
      currency: inv.currency,
      investment_entity_id: String(inv.investment_entity_id),
      started_at: inv.started_at.slice(0, 10),
    })
    setEditingInvestment(inv)
  }

  function buildCreatePayload(): InvestmentPayload | null {
    const name = form.name.trim()
    const investmentEntityId = Number(form.investment_entity_id)
    const amountInvested = Number(form.amount_invested)

    // Normalize user input into API payload and enforce business constraints.
    if (name.length < 2) { toast(t('investments.toast_name_short'), 'error'); return null }
    if (!Number.isInteger(investmentEntityId) || investmentEntityId <= 0) { toast(t('investments.toast_select_entity'), 'error'); return null }
    if (!form.amount_invested || amountInvested <= 0) { toast(t('investments.toast_amount_zero'), 'error'); return null }
    if (!form.started_at) { toast(t('investments.toast_select_date'), 'error'); return null }

    return {
      name,
      instrument_type: form.instrument_type,
      amount_invested: amountInvested,
      current_value: amountInvested,
      currency: form.currency as 'COP' | 'USD',
      investment_entity_id: investmentEntityId,
      started_at: new Date(form.started_at).toISOString(),
    }
  }

  function buildUpdatePayload(): InvestmentUpdatePayload | null {
    const name = form.name.trim()
    const investmentEntityId = Number(form.investment_entity_id)
    const currentValue = Number(form.current_value)

    // Editing flow only updates mutable fields (not amount_invested/currency).
    if (name.length < 2) { toast(t('investments.toast_name_short'), 'error'); return null }
    if (!Number.isInteger(investmentEntityId) || investmentEntityId <= 0) { toast(t('investments.toast_select_entity'), 'error'); return null }
    if (form.current_value === '' || currentValue < 0) { toast(t('investments.toast_value_negative'), 'error'); return null }
    if (!form.started_at) { toast(t('investments.toast_select_date'), 'error'); return null }

    return {
      name,
      instrument_type: form.instrument_type,
      current_value: currentValue,
      investment_entity_id: investmentEntityId,
      started_at: new Date(form.started_at).toISOString(),
    }
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const payload = buildCreatePayload()
    if (!payload) return
    setSaving(true)
    try {
      const res = await investmentsApi.create(payload)
      setInvestments(prev => [res.data, ...prev])
      setCreateOpen(false)
      toast(t('investments.toast_created'), 'success')
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.detail : null
      toast(msg ?? t('investments.toast_create_error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingInvestment) return
    const payload = buildUpdatePayload()
    if (!payload) return
    setSaving(true)
    try {
      const res = await investmentsApi.update(editingInvestment.id, payload)
      setInvestments(prev => prev.map(inv => inv.id === editingInvestment.id ? res.data : inv))
      setEditingInvestment(null)
      toast(t('investments.toast_updated'), 'success')
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.detail : null
      toast(msg ?? t('investments.toast_update_error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingInvestment) return
    setSaving(true)
    try {
      await investmentsApi.delete(deletingInvestment.id)
      setInvestments(prev => prev.filter(inv => inv.id !== deletingInvestment.id))
      setDeletingInvestment(null)
      toast(t('investments.toast_deleted'), 'success')
    } catch {
      toast(t('investments.toast_delete_error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const entityFilterOptions = [
    { value: '', label: t('investments.filter_entity_all') },
    ...entities.map(entity => ({ value: String(entity.id), label: entity.name })),
  ]
  const typeFilterOptions = [
    { value: '', label: t('investments.filter_type_all') },
    ...INSTRUMENT_TYPES.map(type => ({ value: type, label: type })),
  ]
  const currencyFilterOptions = [
    { value: '', label: t('investments.filter_currency_all') },
    { value: 'COP', label: 'COP' },
    { value: 'USD', label: 'USD' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-medium text-neutral-900">{t('investments.title')}</h1>
        <p className="text-sm text-neutral-700 mt-0.5">{t('investments.subtitle')}</p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label={t('investments.kpi_invested')}
          value={formatCurrency(totalInvested, 'COP')}
          accent="border-t-2 border-t-brand"
        />
        <KpiCard
          label={t('investments.kpi_current')}
          value={formatCurrency(totalCurrent, 'COP')}
          accent="border-t-2 border-t-success"
        />
        <KpiCard
          label={t('investments.kpi_gain')}
          value={`${gainPositive ? '+' : ''}${formatCurrency(totalGain, 'COP')}`}
          accent={gainPositive ? 'border-t-2 border-t-success' : 'border-t-2 border-t-warning'}
          sub={t('investments.kpi_return', { sign: gainPositive ? '+' : '', pct: returnPct })}
          subColor={gainPositive ? 'text-success' : 'text-warning'}
        />
      </div>

      {/* Filters */}
      <FilterCard
        sticky
        activeFilters={activeFilters}
        onReset={hasFilters ? () => { setFilterQuery(''); setFilterEntity(''); setFilterType(''); setFilterCurrency('') } : undefined}
      >
        <div className="flex min-w-[180px] flex-1 flex-col gap-1">
          <label className="app-label">{t('common.search')}</label>
          <SearchInput
            value={filterQuery}
            onChange={setFilterQuery}
            placeholder={t('investments.filter_search_placeholder')}
          />
        </div>
        <div className="flex w-44 flex-col gap-1">
          <label className="app-label">{t('common.entity')}</label>
          <Select
            value={filterEntity}
            onChange={setFilterEntity}
            options={entityFilterOptions}
            className="w-full"
            active={!!filterEntity}
          />
        </div>
        <div className="flex w-40 flex-col gap-1">
          <label className="app-label">{t('common.type')}</label>
          <Select
            value={filterType}
            onChange={setFilterType}
            options={typeFilterOptions}
            className="w-full"
            active={!!filterType}
          />
        </div>
        <div className="flex w-36 flex-col gap-1">
          <label className="app-label">{t('common.currency')}</label>
          <Select
            value={filterCurrency}
            onChange={setFilterCurrency}
            options={currencyFilterOptions}
            className="w-full"
            active={!!filterCurrency}
          />
        </div>
      </FilterCard>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="app-card">
          <EmptyState
            title={investments.length === 0 ? t('investments.empty_no_investments') : t('investments.empty_no_results')}
            description={investments.length === 0 ? t('investments.empty_create_hint') : t('investments.empty_filter_hint')}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(inv => {
            const gain = inv.current_value - inv.amount_invested
            const pct = inv.amount_invested > 0 ? ((gain / inv.amount_invested) * 100).toFixed(1) : '0.0'
            const positive = gain >= 0
            const entity = entityById.get(inv.investment_entity_id)

            return (
              <div
                key={inv.id}
                className={`bg-white border border-neutral-100 rounded-xl p-4 flex flex-col gap-3 ${positive ? 'border-t-2 border-t-success' : 'border-t-2 border-t-warning'}`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{inv.name}</p>
                    <p className="text-xs text-neutral-400 truncate">{entity?.name ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <EditButton onClick={() => openEdit(inv)} />
                    <DeleteButton onClick={() => setDeletingInvestment(inv)} />
                  </div>
                </div>

                {/* Instrument type + currency */}
                <div className="flex items-center gap-2">
                  {instrumentBadge(inv.instrument_type)}
                  <span className="text-xs bg-neutral-100 text-neutral-700 rounded-full px-2 py-0.5 font-medium">
                    {inv.currency}
                  </span>
                </div>

                {/* Values */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-neutral-400 uppercase tracking-wide">{t('investments.card_invested')}</p>
                    <p className="text-neutral-900 font-medium mt-0.5">
                      {formatCurrency(inv.amount_invested, inv.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400 uppercase tracking-wide">{t('investments.card_current')}</p>
                    <p className="text-neutral-900 font-medium mt-0.5">
                      {formatCurrency(inv.current_value, inv.currency)}
                    </p>
                  </div>
                </div>

                {/* Gain/loss */}
                <div className={`rounded-lg px-3 py-2 ${positive ? 'bg-success-bg' : 'bg-warning-bg'}`}>
                  <p className={`text-xs font-medium ${positive ? 'text-success-text' : 'text-warning-text'}`}>
                    {positive ? '+' : ''}{formatCurrency(gain, inv.currency)}
                    <span className="font-normal ml-1 opacity-80">({positive ? '+' : ''}{pct}%)</span>
                  </p>
                </div>

                {/* Date */}
                <p className="text-xs text-neutral-400">{t('investments.card_since', { date: formatDate(inv.started_at) })}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <FloatingActionMenu
        items={[{ key: 'new', label: t('investments.fab_create'), onClick: openCreate }]}
      />

      {/* Create modal */}
      {createOpen && (
        <InvestmentModal
          title={t('investments.create_title')}
          isEditing={false}
          form={form}
          setForm={setForm}
          entities={entities}
          saving={saving}
          submitLabel={t('investments.submit_create')}
          onSubmit={handleCreate}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {/* Edit modal */}
      {editingInvestment && (
        <InvestmentModal
          title={t('investments.edit_title')}
          isEditing
          form={form}
          setForm={setForm}
          entities={entities}
          saving={saving}
          submitLabel={t('investments.submit_edit')}
          onSubmit={handleUpdate}
          onClose={() => setEditingInvestment(null)}
        />
      )}

      {/* Delete confirmation */}
      {deletingInvestment && (
        <ConfirmDeleteModal
          title={t('investments.delete_title')}
          description={t('investments.delete_desc', { name: deletingInvestment.name })}
          loading={saving}
          onConfirm={handleDelete}
          onClose={() => setDeletingInvestment(null)}
        />
      )}
    </div>
  )
}
