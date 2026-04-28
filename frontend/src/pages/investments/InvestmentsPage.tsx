import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { AxiosError } from 'axios'
import { investmentEntitiesApi, type InvestmentEntity } from '@/api/investmentEntities'
import { investmentsApi, INSTRUMENT_TYPES, type InvestmentPayload, type InvestmentUpdatePayload } from '@/api/investments'
import type { Investment } from '@/types'
import { useToast } from '@/hooks/useToast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import EditButton from '@/components/ui/EditButton'
import DeleteButton from '@/components/ui/DeleteButton'
import Select from '@/components/ui/Select'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'

function formatCurrency(value: number, currency: string): string {
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
  const entityOptions = [
    { value: '', label: 'Selecciona una entidad' },
    ...entities.map(entity => ({ value: String(entity.id), label: entity.name })),
  ]
  const instrumentOptions = INSTRUMENT_TYPES.map(t => ({ value: t, label: t }))
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
              {isEditing ? 'Edita los datos de la inversión.' : 'Registra una nueva inversión en tu portafolio.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
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
            <label className="app-label">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(c => ({ ...c, name: e.target.value }))}
              className="app-control w-full"
              placeholder="Ej: Fondo de acciones EEUU"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="app-label">Tipo de instrumento</label>
              <Select
                value={form.instrument_type}
                onChange={v => setForm(c => ({ ...c, instrument_type: v }))}
                options={instrumentOptions}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="app-label">Entidad de inversión</label>
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
                <label className="app-label">Monto invertido</label>
                <p className="app-control w-full min-h-10 flex items-center text-neutral-700">
                  {form.amount_invested ? formatCurrency(Number(form.amount_invested), form.currency) : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="app-label">Valor actual</label>
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
              <label className="app-label">Monto invertido</label>
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
              <label className="app-label">Moneda</label>
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
              label="Fecha de inicio"
              value={form.started_at}
              onChange={v => setForm(c => ({ ...c, started_at: v }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <button type="submit" className="app-btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : submitLabel}
            </button>
            <button type="button" className="app-btn-secondary" onClick={onClose}>
              Cancelar
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
  const { toast } = useToast()

  const [investments, setInvestments] = useState<Investment[]>([])
  const [entities, setEntities] = useState<InvestmentEntity[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<InvestmentFormState>(emptyForm())

  // Filters
  const [filterEntity, setFilterEntity] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCurrency, setFilterCurrency] = useState('')

  useEffect(() => {
    Promise.all([investmentsApi.list(), investmentEntitiesApi.list()])
      .then(([invRes, entityRes]) => {
        setInvestments(invRes.data)
        setEntities(entityRes.data)
      })
      .catch(() => toast('Error al cargar inversiones.', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const entityById = useMemo(() => new Map(entities.map(entity => [entity.id, entity])), [entities])

  const filtered = useMemo(() => investments.filter(inv => {
    if (filterEntity && String(inv.investment_entity_id) !== filterEntity) return false
    if (filterType && inv.instrument_type !== filterType) return false
    if (filterCurrency && inv.currency !== filterCurrency) return false
    return true
  }), [investments, filterEntity, filterType, filterCurrency])

  const totalInvested = useMemo(() =>
    filtered.reduce((sum, inv) => sum + inv.amount_invested, 0), [filtered])
  const totalCurrent = useMemo(() =>
    filtered.reduce((sum, inv) => sum + inv.current_value, 0), [filtered])
  const totalGain = totalCurrent - totalInvested
  const returnPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : '0.0'
  const gainPositive = totalGain >= 0

  const hasFilters = filterEntity || filterType || filterCurrency

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

    if (name.length < 2) { toast('El nombre debe tener al menos 2 caracteres.', 'error'); return null }
    if (!Number.isInteger(investmentEntityId) || investmentEntityId <= 0) { toast('Selecciona una entidad.', 'error'); return null }
    if (!form.amount_invested || amountInvested <= 0) { toast('El monto invertido debe ser mayor a 0.', 'error'); return null }
    if (!form.started_at) { toast('Selecciona una fecha de inicio.', 'error'); return null }

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

    if (name.length < 2) { toast('El nombre debe tener al menos 2 caracteres.', 'error'); return null }
    if (!Number.isInteger(investmentEntityId) || investmentEntityId <= 0) { toast('Selecciona una entidad.', 'error'); return null }
    if (form.current_value === '' || currentValue < 0) { toast('El valor actual debe ser 0 o mayor.', 'error'); return null }
    if (!form.started_at) { toast('Selecciona una fecha de inicio.', 'error'); return null }

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
      toast('Inversión registrada.', 'success')
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.detail : null
      toast(msg ?? 'Error al crear la inversión.', 'error')
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
      toast('Inversión actualizada.', 'success')
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.detail : null
      toast(msg ?? 'Error al actualizar la inversión.', 'error')
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
      toast('Inversión eliminada.', 'success')
    } catch {
      toast('Error al eliminar la inversión.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const entityFilterOptions = [
    { value: '', label: 'Todas las entidades' },
    ...entities.map(entity => ({ value: String(entity.id), label: entity.name })),
  ]
  const typeFilterOptions = [
    { value: '', label: 'Todos los tipos' },
    ...INSTRUMENT_TYPES.map(t => ({ value: t, label: t })),
  ]
  const currencyFilterOptions = [
    { value: '', label: 'Todas las monedas' },
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
        <h1 className="text-xl font-medium text-neutral-900">Inversiones</h1>
        <p className="text-sm text-neutral-700 mt-0.5">Seguimiento de tus posiciones de inversión.</p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Total invertido"
          value={formatCurrency(totalInvested, 'COP')}
          accent="border-t-2 border-t-brand"
        />
        <KpiCard
          label="Valor actual"
          value={formatCurrency(totalCurrent, 'COP')}
          accent="border-t-2 border-t-success"
        />
        <KpiCard
          label="Ganancia / Pérdida"
          value={`${gainPositive ? '+' : ''}${formatCurrency(totalGain, 'COP')}`}
          accent={gainPositive ? 'border-t-2 border-t-success' : 'border-t-2 border-t-warning'}
          sub={`${gainPositive ? '+' : ''}${returnPct}% retorno`}
          subColor={gainPositive ? 'text-success' : 'text-warning'}
        />
      </div>

      {/* Filters */}
      <div className="bg-white border border-neutral-100 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            value={filterEntity}
            onChange={setFilterEntity}
            options={entityFilterOptions}
          />
          <Select
            value={filterType}
            onChange={setFilterType}
            options={typeFilterOptions}
          />
          <Select
            value={filterCurrency}
            onChange={setFilterCurrency}
            options={currencyFilterOptions}
          />
        </div>
        {hasFilters && (
          <button
            className="mt-3 text-xs text-brand hover:underline"
            onClick={() => { setFilterEntity(''); setFilterType(''); setFilterCurrency('') }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-neutral-100 rounded-xl p-10 text-center text-neutral-400">
          {investments.length === 0
            ? 'Aún no tienes inversiones registradas. Crea una con el botón +.'
            : 'No hay inversiones que coincidan con los filtros.'}
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
                    <p className="text-neutral-400 uppercase tracking-wide">Invertido</p>
                    <p className="text-neutral-900 font-medium mt-0.5">
                      {formatCurrency(inv.amount_invested, inv.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400 uppercase tracking-wide">Valor actual</p>
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
                <p className="text-xs text-neutral-400">Desde {formatDate(inv.started_at)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <FloatingActionMenu
        items={[{ key: 'new', label: 'Nueva inversión', onClick: openCreate }]}
      />

      {/* Create modal */}
      {createOpen && (
        <InvestmentModal
          title="Registrar inversión"
          isEditing={false}
          form={form}
          setForm={setForm}
          entities={entities}
          saving={saving}
          submitLabel="Registrar"
          onSubmit={handleCreate}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {/* Edit modal */}
      {editingInvestment && (
        <InvestmentModal
          title="Editar inversión"
          isEditing
          form={form}
          setForm={setForm}
          entities={entities}
          saving={saving}
          submitLabel="Guardar cambios"
          onSubmit={handleUpdate}
          onClose={() => setEditingInvestment(null)}
        />
      )}

      {/* Delete confirmation */}
      {deletingInvestment && (
        <ConfirmDeleteModal
          title="Eliminar inversión"
          description={`¿Eliminar la inversión "${deletingInvestment.name}"? Esta acción no se puede deshacer.`}
          loading={saving}
          onConfirm={handleDelete}
          onClose={() => setDeletingInvestment(null)}
        />
      )}
    </div>
  )
}
