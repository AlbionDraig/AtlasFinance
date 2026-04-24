import type { Dispatch, FormEvent, SetStateAction } from 'react'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
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
  formError: string | null
  maxDate: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onReset: () => void
}

export default function TransactionFormCard({
  form,
  setForm,
  accounts,
  categoryOptions,
  accountCurrency,
  editingId,
  saving,
  formError,
  maxDate,
  onSubmit,
  onReset,
}: TransactionFormCardProps) {
  return (
    <form onSubmit={onSubmit} className="order-3 app-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="app-section-title">{editingId != null ? 'Editar movimiento' : 'Registrar movimiento'}</h2>
        {editingId != null && (
          <span className="rounded-full bg-[var(--af-warning-soft)] px-3 py-1 text-xs font-medium text-[var(--af-negative)]">
            Modo edicion
          </span>
        )}
      </div>

      {formError && <p className="alert-error">{formError}</p>}

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        <DatePicker
          label="Fecha"
          value={form.occurredDate}
          onChange={(value) => setForm((current) => ({ ...current, occurredDate: value }))}
          max={maxDate}
          className="w-full"
        />
        <div className="space-y-1">
          <label className="app-label">Hora</label>
          <input
            type="time"
            step="60"
            value={form.occurredTime}
            onChange={(event) => setForm((current) => ({ ...current, occurredTime: event.target.value }))}
            className="app-control w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button type="submit" className="app-btn-primary" disabled={saving || !accounts.length}>
          {saving ? 'Guardando...' : editingId != null ? 'Guardar cambios' : 'Guardar movimiento'}
        </button>
        <button type="button" className="app-btn-secondary" onClick={onReset}>
          {editingId != null ? 'Cancelar' : 'Limpiar'}
        </button>
      </div>
    </form>
  )
}
