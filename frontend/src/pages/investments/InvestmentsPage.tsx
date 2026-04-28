import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { AxiosError } from 'axios'
import { banksApi, type Bank } from '@/api/banks'
import { investmentsApi, INSTRUMENT_TYPES, type InvestmentPayload, type InvestmentUpdatePayload } from '@/api/investments'
import type { Investment } from '@/types'
import { useToast } from '@/hooks/useToast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import EditButton from '@/components/ui/EditButton'
import DeleteButton from '@/components/ui/DeleteButton'
import Select from '@/components/ui/Select'
import AmountInput from '@/components/ui/AmountInput'
import InlineAlert from '@/components/ui/InlineAlert'

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
  bank_id: string
  started_at: string
}

function emptyForm(): InvestmentFormState {
  return {
    name: '',
    instrument_type: INSTRUMENT_TYPES[0],
    amount_invested: '',
    current_value: '',
    currency: 'COP',
    bank_id: '',
    started_at: new Date().toISOString().slice(0, 10),
  }
}

interface InvestmentModalProps {
  title: string
  isEditing: boolean
  form: InvestmentFormState
  setForm: Dispatch<SetStateAction<InvestmentFormState>>
  banks: Bank[]
  saving: boolean
  submitLabel: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

function InvestmentModal({
  title, isEditing, form, setForm, banks, saving, submitLabel, onSubmit, onClose,
}: InvestmentModalProps) {
  const bankOptions = [
    { value: '', label: 'Selecciona una entidad' },
    ...banks.map(b => ({ value: String(b.id), label: b.name })),
  ]
  const instrumentOptions = INSTRUMENT_TYPES.map(t => ({ value: t, label: t }))
  const currencyOptions = [
    { value: 'COP', label: 'COP' },
    { value: 'USD', label: 'USD' },
  ]

  return (
    <Modal onClose={onClose}>
      <div className="bg-white border border-neutral-100 rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-base font-medium text-neutral-900">{title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">&times;</button>
        </div>
        <div className="px-5 py-4">
          <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Nombre">
          <input
            className="app-control"
            type="text"
            value={form.name}
            onChange={e => setForm(c => ({ ...c, name: e.target.value }))}
            placeholder="Ej: Fondo de acciones EEUU"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tipo de instrumento">
            <Select
              value={form.instrument_type}
              onChange={v => setForm(c => ({ ...c, instrument_type: v }))}
              options={instrumentOptions}
            />
          </FormField>
          <FormField label="Entidad / Banco">
            <Select
              value={form.bank_id}
              onChange={v => setForm(c => ({ ...c, bank_id: v }))}
              options={bankOptions}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Monto invertido">
            {isEditing ? (
              <p className="app-control w-full min-h-10 flex items-center text-neutral-700">
                {form.amount_invested ? formatCurrency(Number(form.amount_invested), form.currency) : '—'}
              </p>
            ) : (
              <>
                <AmountInput
                  value={form.amount_invested}
                  onChange={raw => setForm(c => ({ ...c, amount_invested: raw }))}
                  currency={form.currency || 'COP'}
                  className="w-full"
                  placeholder="0"
                />
                <InlineAlert
                  className="mt-2"
                  message="El monto invertido no se puede modificar después de registrar la inversión."
                />
              </>
            )}
          </FormField>
          <FormField label="Valor actual">
            <AmountInput
              value={form.current_value}
              onChange={raw => setForm(c => ({ ...c, current_value: raw }))}
              currency={form.currency || 'COP'}
              className="w-full"
              placeholder="0"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Moneda">
            {isEditing ? (
              <p className="app-control w-full min-h-10 flex items-center text-neutral-700">{form.currency}</p>
            ) : (
              <Select
                value={form.currency}
                onChange={v => setForm(c => ({ ...c, currency: v }))}
                options={currencyOptions}
              />
            )}
          </FormField>
          <FormField label="Fecha de inicio">
            <input
              className="app-control"
              type="date"
              value={form.started_at}
              onChange={e => setForm(c => ({ ...c, started_at: e.target.value }))}
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : submitLabel}
          </button>
        </div>
          </form>
        </div>
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
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<InvestmentFormState>(emptyForm())

  // Filters
  const [filterBank, setFilterBank] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCurrency, setFilterCurrency] = useState('')

  useEffect(() => {
    Promise.all([investmentsApi.list(), banksApi.list()])
      .then(([invRes, bankRes]) => {
        setInvestments(invRes.data)
        setBanks(bankRes.data)
      })
      .catch(() => toast('Error al cargar inversiones.', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const bankById = useMemo(() => new Map(banks.map(b => [b.id, b])), [banks])

  const filtered = useMemo(() => investments.filter(inv => {
    if (filterBank && String(inv.bank_id) !== filterBank) return false
    if (filterType && inv.instrument_type !== filterType) return false
    if (filterCurrency && inv.currency !== filterCurrency) return false
    return true
  }), [investments, filterBank, filterType, filterCurrency])

  const totalInvested = useMemo(() =>
    filtered.reduce((sum, inv) => sum + inv.amount_invested, 0), [filtered])
  const totalCurrent = useMemo(() =>
    filtered.reduce((sum, inv) => sum + inv.current_value, 0), [filtered])
  const totalGain = totalCurrent - totalInvested
  const returnPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : '0.0'
  const gainPositive = totalGain >= 0

  const hasFilters = filterBank || filterType || filterCurrency

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
      bank_id: String(inv.bank_id),
      started_at: inv.started_at.slice(0, 10),
    })
    setEditingInvestment(inv)
  }

  function buildCreatePayload(): InvestmentPayload | null {
    const name = form.name.trim()
    const bankId = Number(form.bank_id)
    const amountInvested = Number(form.amount_invested)
    const currentValue = Number(form.current_value)

    if (name.length < 2) { toast('El nombre debe tener al menos 2 caracteres.', 'error'); return null }
    if (!Number.isInteger(bankId) || bankId <= 0) { toast('Selecciona una entidad.', 'error'); return null }
    if (!form.amount_invested || amountInvested <= 0) { toast('El monto invertido debe ser mayor a 0.', 'error'); return null }
    if (form.current_value === '' || currentValue < 0) { toast('El valor actual debe ser 0 o mayor.', 'error'); return null }
    if (!form.started_at) { toast('Selecciona una fecha de inicio.', 'error'); return null }

    return {
      name,
      instrument_type: form.instrument_type,
      amount_invested: amountInvested,
      current_value: currentValue,
      currency: form.currency as 'COP' | 'USD',
      bank_id: bankId,
      started_at: new Date(form.started_at).toISOString(),
    }
  }

  function buildUpdatePayload(): InvestmentUpdatePayload | null {
    const name = form.name.trim()
    const bankId = Number(form.bank_id)
    const currentValue = Number(form.current_value)

    if (name.length < 2) { toast('El nombre debe tener al menos 2 caracteres.', 'error'); return null }
    if (!Number.isInteger(bankId) || bankId <= 0) { toast('Selecciona una entidad.', 'error'); return null }
    if (form.current_value === '' || currentValue < 0) { toast('El valor actual debe ser 0 o mayor.', 'error'); return null }
    if (!form.started_at) { toast('Selecciona una fecha de inicio.', 'error'); return null }

    return {
      name,
      instrument_type: form.instrument_type,
      current_value: currentValue,
      bank_id: bankId,
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

  const bankFilterOptions = [
    { value: '', label: 'Todas las entidades' },
    ...banks.map(b => ({ value: String(b.id), label: b.name })),
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
            value={filterBank}
            onChange={setFilterBank}
            options={bankFilterOptions}
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
            onClick={() => { setFilterBank(''); setFilterType(''); setFilterCurrency('') }}
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
            const bank = bankById.get(inv.bank_id)

            return (
              <div
                key={inv.id}
                className={`bg-white border border-neutral-100 rounded-xl p-4 flex flex-col gap-3 ${positive ? 'border-t-2 border-t-success' : 'border-t-2 border-t-warning'}`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{inv.name}</p>
                    <p className="text-xs text-neutral-400 truncate">{bank?.name ?? '—'}</p>
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
          banks={banks}
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
          banks={banks}
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
