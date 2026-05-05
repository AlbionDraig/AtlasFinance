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
      <div className="w-full rounded-2xl border border-neutral-100 border-t-4 border-t-brand bg-white shadow-xl overflow-visible">
        <div className="flex items-start gap-3 border-b border-brand/10 bg-brand-light px-6 py-4">
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
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
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
