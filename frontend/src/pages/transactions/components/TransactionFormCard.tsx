import type { Dispatch, FormEvent, SetStateAction } from 'react'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
import TimePicker from '@/components/ui/TimePicker'
import type { Account } from '@/types'
import type { Category } from '@/api/categories'
import type { FormState, TransactionType } from '../types'

interface TransactionFormCardProps {
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  accounts: Account[]
  categoryOptions: Category[]
  accountCurrency: string
  editingId: number | null
  saving: boolean
  maxDate: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onReset: () => void
}

function RegisterModeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
    </svg>
  )
}

function EditModeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M4.5 14.5 4 16l1.5-.5L14 7 12.5 5.5 4.5 14.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11.5 6.5 13 5a1.4 1.4 0 0 1 2 0l.5.5a1.4 1.4 0 0 1 0 2L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function TransactionFormCard({
  form,
  setForm,
  accounts,
  categoryOptions,
  accountCurrency,
  editingId,
  saving,
  maxDate,
  onSubmit,
  onReset,
}: TransactionFormCardProps) {
  const submitLabel = saving ? 'Guardando...' : 'Guardar movimiento'
  const isEditing = editingId != null
  const formAccentClass = isEditing
    ? 'border-t-4 border-t-warning'
    : 'border-t-4 border-t-brand'
  const modePanelClass = isEditing
    ? 'bg-warning-bg border-warning/20'
    : 'bg-brand-light border-brand/20'
  const modeTitleClass = isEditing ? 'text-warning-text' : 'text-brand-text'
  const modeIconWrapClass = isEditing
    ? 'bg-warning text-white shadow-[0_0_0_6px_rgba(196,122,0,0.12)]'
    : 'bg-brand text-white shadow-[0_0_0_6px_rgba(202,11,11,0.12)]'

  return (
    <form onSubmit={onSubmit} className={`order-3 app-card p-5 space-y-4 shadow-xl ${formAccentClass}`}>
      <div className={`rounded-xl border px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${modePanelClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 hover:scale-105 ${modeIconWrapClass}`}>
              {isEditing ? <EditModeIcon /> : <RegisterModeIcon />}
            </div>
            <div className="space-y-1">
              <h2 className={`app-section-title ${modeTitleClass}`}>
                {isEditing ? 'Editar movimiento' : 'Registrar movimiento'}
              </h2>
              <p className="text-sm text-neutral-700">
                {isEditing ? 'Estas actualizando un movimiento existente.' : 'Completa los datos para registrar un nuevo movimiento.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="app-label">Descripcion</label>
        <input
          type="text"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          className="app-control w-full"
          placeholder="Ej: Supermercado, salario, gasolina"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="app-label">Tipo</label>
          <Select
            value={form.transactionType}
            onChange={(value) => setForm((current) => ({
              ...current,
              transactionType: value as TransactionType,
              categoryId: 'none',
            }))}
            options={[
              { value: 'EXPENSE', label: 'Gasto' },
              { value: 'INCOME', label: 'Ingreso' },
            ]}
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <label className="app-label">Monto</label>
          <AmountInput
            value={form.amount}
            onChange={(raw) => setForm((current) => ({ ...current, amount: raw }))}
            currency={accountCurrency}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="app-label">Cuenta</label>
          <Select
            value={form.accountId}
            onChange={(value) => setForm((current) => ({ ...current, accountId: value }))}
            options={accounts.map((account) => ({ value: String(account.id), label: `${account.name} (${account.currency})` }))}
            className="w-full"
            disabled={!accounts.length}
          />
        </div>

        <div className="space-y-1">
          <label className="app-label">Categoria</label>
          <Select
            value={form.categoryId}
            onChange={(value) => setForm((current) => ({ ...current, categoryId: value }))}
            options={[
              { value: 'none', label: 'Sin categoria' },
              ...categoryOptions.map((category) => ({ value: String(category.id), label: category.name })),
            ]}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DatePicker
          label="Fecha"
          value={form.occurredDate}
          onChange={(value) => setForm((current) => ({ ...current, occurredDate: value }))}
          max={maxDate}
          className="w-full"
        />
        <TimePicker
          label="Hora"
          value={form.occurredTime}
          onChange={(value) => setForm((current) => ({ ...current, occurredTime: value }))}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button type="submit" className="app-btn-primary" disabled={saving || !accounts.length}>
          {submitLabel}
        </button>
        <button type="button" className="app-btn-secondary order-last sm:order-none" onClick={onReset}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
