import { useMemo, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { AxiosError } from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { type InvestmentEntity } from '@/api/investmentEntities'
import { investmentsApi, INSTRUMENT_TYPES } from '@/api/investments'
import type { Investment } from '@/types'
import { useToast } from '@/hooks/useToast'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import { formatCurrency } from '@/lib/utils'
import { useInvestmentsData } from '@/hooks/useInvestmentsData'
import PageSkeleton from '@/components/ui/PageSkeleton'
import Modal from '@/components/ui/Modal'
import ResponsiveFilters from '@/components/ui/ResponsiveFilters'
import SearchInput from '@/components/ui/SearchInput'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import EmptyState from '@/components/ui/EmptyState'
import EditButton from '@/components/ui/EditButton'
import DeleteButton from '@/components/ui/DeleteButton'
import TableActionGroup from '@/components/ui/TableActionGroup'
import Select from '@/components/ui/Select'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'
import { daysSinceInvestment, formatInvestmentDate, renderInstrumentBadge } from './investmentDisplay'
import {
  type InvestmentFormErrors,
  type InvestmentFormState,
} from './investmentPayload'
import { useInvestmentForm } from './hooks/useInvestmentForm'

const UNDO_WINDOW_MS = 5000

interface InvestmentModalProps {
  title: string
  isEditing: boolean
  form: InvestmentFormState
  errors: InvestmentFormErrors
  setForm: Dispatch<SetStateAction<InvestmentFormState>>
  entities: InvestmentEntity[]
  saving: boolean
  submitLabel: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

function InvestmentModal({
  title, isEditing, form, errors, setForm, entities, saving, submitLabel, onSubmit, onClose,
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
              className={`app-control w-full ${errors.name ? 'border-warning' : ''}`}
              placeholder={t('investments.field_name_placeholder')}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs tone-negative">{errors.name}</p>}
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
              {errors.investment_entity_id && <p className="mt-1 text-xs tone-negative">{errors.investment_entity_id}</p>}
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
                {errors.current_value && <p className="mt-1 text-xs tone-negative">{errors.current_value}</p>}
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
              {errors.amount_invested && <p className="mt-1 text-xs tone-negative">{errors.amount_invested}</p>}
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
            {errors.started_at && <p className="mt-1 text-xs tone-negative">{errors.started_at}</p>}
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
  accent: 'brand' | 'success' | 'warning'
  sub?: string
  subColor?: string
  icon?: ReactNode
}
function KpiCard({ label, value, accent, sub, subColor, icon }: KpiCardProps) {
  const accentStyles = {
    brand: {
      line: 'bg-brand',
      ring: 'ring-brand/15',
      glow: 'bg-brand/10',
      icon: 'bg-brand-light text-brand',
    },
    success: {
      line: 'bg-success',
      ring: 'ring-success/15',
      glow: 'bg-success/10',
      icon: 'bg-success-bg text-success',
    },
    warning: {
      line: 'bg-warning',
      ring: 'ring-warning/15',
      glow: 'bg-warning/10',
      icon: 'bg-warning-bg text-warning',
    },
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
      {sub && <p className={`mt-1 text-[13px] ${subColor ?? 'text-neutral-400'}`}>{sub}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InvestmentsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { investments, setInvestments, entities, loading } = useInvestmentsData()

  const {
    createOpen,
    setCreateOpen,
    editingInvestment,
    setEditingInvestment,
    form,
    setForm,
    formErrors,
    openCreateModal,
    prepareEdit,
    buildCreatePayloadFromForm,
    buildUpdatePayloadFromForm,
  } = useInvestmentForm({
    onValidationError: (message) => toast(message, 'error'),
  })
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null)
  const [saving, setSaving] = useState(false)
  const pendingDeleteTimeoutsRef = useRef<Map<number, number>>(new Map())

  // Filters
  const [filterQuery, setFilterQuery] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCurrency, setFilterCurrency] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const entityById = useMemo(() => new Map(entities.map(entity => [entity.id, entity])), [entities])

  const filtered = useMemo(() => {
    const base = investments.filter(inv => {
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
    })

    if (!sortBy) return base
    return [...base].sort((a, b) => {
      const gainPctA = a.amount_invested > 0 ? (a.current_value - a.amount_invested) / a.amount_invested : 0
      const gainPctB = b.amount_invested > 0 ? (b.current_value - b.amount_invested) / b.amount_invested : 0
      switch (sortBy) {
        case 'gain_desc':   return gainPctB - gainPctA
        case 'gain_asc':    return gainPctA - gainPctB
        case 'invested_desc': return b.amount_invested - a.amount_invested
        case 'date_desc':   return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        case 'date_asc':    return new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
        case 'name_asc':    return a.name.localeCompare(b.name, 'es')
        default:            return 0
      }
    })
  }, [investments, filterQuery, filterEntity, filterType, filterCurrency, entityById, sortBy])

  const totalInvested = useMemo(() =>
    filtered.reduce((sum, inv) => sum + inv.amount_invested, 0), [filtered])
  const totalCurrent = useMemo(() =>
    filtered.reduce((sum, inv) => sum + inv.current_value, 0), [filtered])
  // Derived KPIs shown in summary cards.
  const totalGain = totalCurrent - totalInvested
  const returnPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : '0.0'
  const gainPositive = totalGain >= 0

  const sortOptions = [
    { value: '', label: t('investments.sort_none') },
    { value: 'gain_desc', label: t('investments.sort_gain_desc') },
    { value: 'gain_asc', label: t('investments.sort_gain_asc') },
    { value: 'invested_desc', label: t('investments.sort_invested_desc') },
    { value: 'date_desc', label: t('investments.sort_date_desc') },
    { value: 'date_asc', label: t('investments.sort_date_asc') },
    { value: 'name_asc', label: t('investments.sort_name_asc') },
  ]
  const selectedSortLabel = sortBy
    ? (sortOptions.find(option => option.value === sortBy)?.label ?? '')
    : ''

  const hasFilters = filterQuery || filterEntity || filterType || filterCurrency || sortBy
  const activeFilters = [
    filterQuery && t('investments.chip_search', { value: `"${filterQuery}"` }),
    filterEntity && t('investments.chip_entity', { value: entityById.get(Number(filterEntity))?.name ?? '' }),
    filterType && t('investments.chip_type', { value: filterType }),
    filterCurrency && t('investments.chip_currency', { value: filterCurrency }),
    selectedSortLabel && t('investments.chip_sort', { value: selectedSortLabel }),
  ].filter(Boolean) as string[]

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const payload = buildCreatePayloadFromForm()
    if (!payload) return
    setSaving(true)
    try {
      const res = await investmentsApi.create(payload)
      setInvestments(prev => [res.data, ...prev])
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investments })
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
    const payload = buildUpdatePayloadFromForm()
    if (!payload) return
    setSaving(true)
    try {
      const res = await investmentsApi.update(editingInvestment.id, payload)
      setInvestments(prev => prev.map(inv => inv.id === editingInvestment.id ? res.data : inv))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investments })
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
    const target = deletingInvestment
    const previousIndex = investments.findIndex((investment) => investment.id === target.id)
    setInvestments(prev => prev.filter(inv => inv.id !== target.id))
    setDeletingInvestment(null)

    const timeoutId = window.setTimeout(async () => {
      pendingDeleteTimeoutsRef.current.delete(target.id)
      try {
        await investmentsApi.delete(target.id)
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investments })
      } catch {
        setInvestments((prev) => {
          if (prev.some((investment) => investment.id === target.id)) return prev
          const next = [...prev]
          const index = previousIndex >= 0 ? Math.min(previousIndex, next.length) : next.length
          next.splice(index, 0, target)
          return next
        })
        toast(t('investments.toast_delete_error'), 'error')
      }
    }, UNDO_WINDOW_MS)

    pendingDeleteTimeoutsRef.current.set(target.id, timeoutId)
    toast(t('investments.toast_deleted'), 'success', {
      actionLabel: t('common.undo'),
      onAction: () => {
        const pendingTimeoutId = pendingDeleteTimeoutsRef.current.get(target.id)
        if (pendingTimeoutId != null) {
          window.clearTimeout(pendingTimeoutId)
          pendingDeleteTimeoutsRef.current.delete(target.id)
          setInvestments((prev) => {
            if (prev.some((investment) => investment.id === target.id)) return prev
            const next = [...prev]
            const index = previousIndex >= 0 ? Math.min(previousIndex, next.length) : next.length
            next.splice(index, 0, target)
            return next
          })
        }
      },
    })
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
    return <PageSkeleton cards={2} rows={5} columns={5} />
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
          accent="brand"
          icon={
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M10 2v16M5 7l5-5 5 5M5 17h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          label={t('investments.kpi_current')}
          value={formatCurrency(totalCurrent, 'COP')}
          accent="success"
          icon={
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M3 13l4-4 4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          label={t('investments.kpi_gain')}
          value={`${gainPositive ? '+' : ''}${formatCurrency(totalGain, 'COP')}`}
          accent={gainPositive ? 'success' : 'warning'}
          sub={t('investments.kpi_return', { sign: gainPositive ? '+' : '', pct: returnPct })}
          subColor={gainPositive ? 'text-success' : 'text-warning'}
          icon={
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              {gainPositive
                ? <path d="M4 14l4-4 4 4 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                : <path d="M4 6l4 4 4-4 5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              }
            </svg>
          }
        />
      </div>

      {/* Filters */}
      <ResponsiveFilters
        activeFilters={activeFilters}
        onResetFilters={hasFilters ? () => { setFilterQuery(''); setFilterEntity(''); setFilterType(''); setFilterCurrency(''); setSortBy('') } : undefined}
        mobileTitle={t('investments.title')}
        stickyDesktop
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
        <div className="flex w-44 flex-col gap-1">
          <label className="app-label">{t('common.sort')}</label>
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={sortOptions}
            className="w-full"
            active={!!sortBy}
          />
        </div>
      </ResponsiveFilters>

      <div className="flex flex-col gap-2 rounded-lg border border-brand/20 bg-gradient-to-r from-brand-light/70 to-white px-3 py-2 text-xs text-brand-text sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <p>
            {filtered.length === investments.length
              ? t('investments.results_count_total', { total: investments.length })
              : t('investments.results_count_filtered', { shown: filtered.length, total: investments.length })}
          </p>
          {selectedSortLabel && <p className="text-neutral-700">{t('investments.chip_sort', { value: selectedSortLabel })}</p>}
        </div>
        <div className="inline-flex rounded-lg border border-brand/20 bg-white/80 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'cards' ? 'bg-brand text-white shadow-sm' : 'text-brand-text hover:bg-brand-light hover:text-brand-text'}`}
            aria-pressed={viewMode === 'cards'}
          >
            {t('investments.view_cards')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-brand text-white shadow-sm' : 'text-brand-text hover:bg-brand-light hover:text-brand-text'}`}
            aria-pressed={viewMode === 'table'}
          >
            {t('investments.view_table')}
          </button>
        </div>
      </div>

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
            action={investments.length === 0 ? (
              <button type="button" className="app-btn-primary" onClick={openCreateModal}>
                {t('investments.fab_create')}
              </button>
            ) : (
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => {
                  setFilterQuery('')
                  setFilterEntity('')
                  setFilterType('')
                  setFilterCurrency('')
                  setSortBy('')
                }}
              >
                {t('common.clearFilters')}
              </button>
            )}
          />
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(inv => {
            const gain = inv.current_value - inv.amount_invested
            const pct = inv.amount_invested > 0 ? ((gain / inv.amount_invested) * 100).toFixed(1) : '0.0'
            const positive = gain >= 0
            const entity = entityById.get(inv.investment_entity_id)
            // Barra de progreso: muestra visualmente cuánto creció o cayó la inversión.
            // Se ancla en el 100% (monto invertido) y se extiende en verde/naranja.
            const perfPct = inv.amount_invested > 0
              ? Math.min(150, (inv.current_value / inv.amount_invested) * 100)
              : 100
            const days = daysSinceInvestment(inv.started_at)

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
                    <EditButton onClick={() => prepareEdit(inv)} />
                    <DeleteButton onClick={() => setDeletingInvestment(inv)} />
                  </div>
                </div>

                {/* Instrument type + currency */}
                <div className="flex items-center gap-2">
                  {renderInstrumentBadge(inv.instrument_type)}
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

                {/* Barra de rendimiento */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${positive ? 'bg-success' : 'bg-warning'}`}
                      style={{ width: `${perfPct}%` }}
                    />
                  </div>
                </div>

                {/* Gain/loss */}
                <div className={`rounded-lg px-3 py-2 ring-1 ${positive ? 'bg-success-bg ring-success/30' : 'bg-warning-bg ring-warning/35'}`}>
                  <p className={`text-xs font-medium ${positive ? 'text-success' : 'text-warning'}`}>
                    {positive ? '+' : ''}{formatCurrency(gain, inv.currency)}
                    <span className="font-normal ml-1 opacity-80">({positive ? '+' : ''}{pct}%)</span>
                  </p>
                </div>

                {/* Date + days */}
                <p className="text-xs text-neutral-400">
                  {t('investments.card_since', { date: formatInvestmentDate(inv.started_at) })}
                  <span className="ml-1 text-neutral-400 opacity-60">· {days} {t('investments.card_days')}</span>
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="app-table-wrap">
          <table className="app-table text-left text-sm">
            <thead className="border-b border-brand/30 bg-brand text-xs text-white">
              <tr>
                <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('investments.table_name')}</th>
                <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('investments.table_entity')}</th>
                <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('investments.table_type')}</th>
                <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('investments.table_invested')}</th>
                <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('investments.table_current')}</th>
                <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('investments.table_performance')}</th>
                <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('investments.table_since')}</th>
                <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('investments.table_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, index) => {
                const gain = inv.current_value - inv.amount_invested
                const pct = inv.amount_invested > 0 ? ((gain / inv.amount_invested) * 100).toFixed(1) : '0.0'
                const positive = gain >= 0
                const entity = entityById.get(inv.investment_entity_id)

                return (
                  <tr
                    key={inv.id}
                    className={`border-b border-neutral-100 last:border-b-0 transition-colors hover:bg-brand-light/35 ${index % 2 === 0 ? 'bg-white' : 'bg-brand-light/10'}`}
                  >
                    <td className="px-3 py-2 text-neutral-900 font-medium">{inv.name}</td>
                    <td className="px-3 py-2 text-neutral-700">{entity?.name ?? '—'}</td>
                    <td className="px-3 py-2">{renderInstrumentBadge(inv.instrument_type)}</td>
                    <td className="px-3 py-2 text-neutral-700 tabular-nums">{formatCurrency(inv.amount_invested, inv.currency)}</td>
                    <td className="px-3 py-2 text-neutral-700 tabular-nums">{formatCurrency(inv.current_value, inv.currency)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${positive ? 'bg-success-bg text-success ring-success/45 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.18)]' : 'bg-warning-bg text-warning ring-warning/45 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.22)]'}`}>
                        <span aria-hidden="true">{positive ? '↗' : '↘'}</span>
                        <span>{positive ? '+' : ''}{pct}%</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-neutral-400">{formatInvestmentDate(inv.started_at)}</td>
                    <td className="px-3 py-2 text-center align-middle">
                      <TableActionGroup>
                        <EditButton onClick={() => prepareEdit(inv)} />
                        <DeleteButton onClick={() => setDeletingInvestment(inv)} />
                      </TableActionGroup>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FAB */}
      <FloatingActionMenu
        ariaLabel={t('investments.fab_menu_label')}
        items={[{ key: 'new', label: t('investments.fab_create'), onClick: openCreateModal }]}
      />

      {/* Create modal */}
      {createOpen && (
        <InvestmentModal
          title={t('investments.create_title')}
          isEditing={false}
          form={form}
          errors={formErrors}
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
          errors={formErrors}
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
