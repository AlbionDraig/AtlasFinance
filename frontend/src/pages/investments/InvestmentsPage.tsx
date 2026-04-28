import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AxiosError } from 'axios'
import { investmentEntitiesApi, type InvestmentEntity } from '@/api/investmentEntities'
import { investmentsApi, INSTRUMENT_TYPES, type InvestmentPayload, type InvestmentUpdatePayload } from '@/api/investments'
import type { Investment } from '@/types'
import { useToast } from '@/hooks/useToast'
import { formatCurrency } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import FilterCard from '@/components/ui/FilterCard'
import SearchInput from '@/components/ui/SearchInput'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import Select from '@/components/ui/Select'
import InvestmentModal, { type InvestmentFormState, emptyInvestmentForm } from './components/InvestmentModal'
import InvestmentCard from './components/InvestmentCard'

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
  const [form, setForm] = useState<InvestmentFormState>(emptyInvestmentForm())

  // Filters
  const [filterQuery, setFilterQuery] = useState('')
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
    setForm(emptyInvestmentForm())
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

    // Editing flow only updates mutable fields (not amount_invested/currency).
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
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">Inversiones</h1>
        <p className="app-subtitle text-sm mt-0.5">Seguimiento de tus posiciones de inversión.</p>
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
      <FilterCard
        sticky
        activeFilters={activeFilters}
        onReset={hasFilters ? () => { setFilterQuery(''); setFilterEntity(''); setFilterType(''); setFilterCurrency('') } : undefined}
      >
        <div className="flex min-w-[180px] flex-1 flex-col gap-1">
          <label className="app-label">Buscar</label>
          <SearchInput
            value={filterQuery}
            onChange={setFilterQuery}
            placeholder="Inversión o entidad"
          />
        </div>
        <div className="flex w-44 flex-col gap-1">
          <label className="app-label">Entidad</label>
          <Select
            value={filterEntity}
            onChange={setFilterEntity}
            options={entityFilterOptions}
            className="w-full"
            active={!!filterEntity}
          />
        </div>
        <div className="flex w-40 flex-col gap-1">
          <label className="app-label">Tipo</label>
          <Select
            value={filterType}
            onChange={setFilterType}
            options={typeFilterOptions}
            className="w-full"
            active={!!filterType}
          />
        </div>
        <div className="flex w-36 flex-col gap-1">
          <label className="app-label">Moneda</label>
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
        <div className="bg-white border border-neutral-100 rounded-xl p-10 text-center text-neutral-400">
          {investments.length === 0
            ? 'Aún no tienes inversiones registradas. Crea una con el botón +.'
            : 'No hay inversiones que coincidan con los filtros.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((inv) => (
            <InvestmentCard
              key={inv.id}
              investment={inv}
              entity={entityById.get(inv.investment_entity_id)}
              onEdit={openEdit}
              onDelete={setDeletingInvestment}
            />
          ))}
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
