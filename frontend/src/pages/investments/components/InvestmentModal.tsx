import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { INSTRUMENT_TYPES } from '@/api/investments'
import type { InvestmentEntity } from '@/api/investmentEntities'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'
import { formatCurrency } from '@/lib/utils'

export interface InvestmentFormState {
  name: string
  instrument_type: string
  amount_invested: string
  current_value: string
  currency: string
  investment_entity_id: string
  started_at: string
}

export function emptyInvestmentForm(): InvestmentFormState {
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

export default function InvestmentModal({
  title,
  isEditing,
  form,
  setForm,
  entities,
  saving,
  submitLabel,
  onSubmit,
  onClose,
}: InvestmentModalProps) {
  const entityOptions = [
    { value: '', label: 'Selecciona una entidad' },
    ...entities.map((entity) => ({ value: String(entity.id), label: entity.name })),
  ]
  const instrumentOptions = INSTRUMENT_TYPES.map((t) => ({ value: t, label: t }))
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
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
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
                onChange={(v) => setForm((c) => ({ ...c, instrument_type: v }))}
                options={instrumentOptions}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="app-label">Entidad de inversión</label>
              <Select
                value={form.investment_entity_id}
                onChange={(v) => setForm((c) => ({ ...c, investment_entity_id: v }))}
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
                  onChange={(raw) => setForm((c) => ({ ...c, current_value: raw }))}
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
                onChange={(raw) => setForm((c) => ({ ...c, amount_invested: raw }))}
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
                  onChange={(v) => setForm((c) => ({ ...c, currency: v }))}
                  options={currencyOptions}
                  className="w-full"
                />
              )}
            </div>
            <DatePicker
              label="Fecha de inicio"
              value={form.started_at}
              onChange={(v) => setForm((c) => ({ ...c, started_at: v }))}
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
