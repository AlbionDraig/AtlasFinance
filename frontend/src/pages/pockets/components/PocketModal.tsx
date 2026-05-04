import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Account } from '@/types'
import { formatCurrency } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import Select from '@/components/ui/Select'
import AmountInput from '@/components/ui/AmountInput'
import InlineAlert from '@/components/ui/InlineAlert'

export interface PocketFormState {
  name: string
  balance: string
  account_id: string
}

export const EMPTY_POCKET_FORM: PocketFormState = {
  name: '',
  balance: '',
  account_id: '',
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

export default function PocketModal({
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
            aria-label="Cerrar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-5 py-4 space-y-4">
          <FormField label="Nombre">
            <input
              className="app-control"
              type="text"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ej: Fondo de viajes"
              maxLength={120}
              autoFocus
            />
          </FormField>

          <FormField label="Cuenta asociada">
            <Select
              value={form.account_id}
              onChange={(value) => setForm((current) => ({ ...current, account_id: value }))}
              options={[
                { value: '', label: 'Selecciona una cuenta' },
                ...accounts.map((account) => ({
                  value: String(account.id),
                  label: `${account.name} · ${account.currency}`,
                })),
              ]}
              className="w-full"
              active={Boolean(form.account_id)}
            />
          </FormField>

          {!isEditing ? (
            <FormField label="Saldo inicial">
              <AmountInput
                value={form.balance}
                onChange={(raw) => setForm((current) => ({ ...current, balance: raw }))}
                currency={selectedAccount?.currency ?? 'COP'}
                className="w-full"
                placeholder="0"
              />
              <InlineAlert
                className="mt-2"
                message={
                  <>
                    El saldo inicial no se puede modificar después de crear el bolsillo. Usa{' '}
                    <span className="font-medium">Mover a bolsillo</span> para actualizar el saldo.
                  </>
                }
              />
            </FormField>
          ) : (
            <FormField label="Saldo actual">
              <p className="app-control w-full min-h-10 flex items-center text-neutral-700">
                {formatCurrency(currentBalance ?? 0, currentCurrency ?? selectedAccount?.currency ?? 'COP')}
              </p>
            </FormField>
          )}

          <p className="text-xs text-neutral-400">
            Los bolsillos solo guardan dinero para propósitos específicos y usan la misma moneda de la cuenta:
            <span className="text-neutral-700"> {selectedAccount?.currency ?? 'N/A'}</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="app-btn-primary"
            >
              {saving ? 'Guardando…' : submitLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="app-btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
