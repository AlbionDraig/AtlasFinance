import { useState, type FormEvent } from 'react'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import TimePicker from '@/components/ui/TimePicker'
import { useToast } from '@/hooks/useToast'
import type { Account } from '@/types'

interface TransferForm {
  fromAccountId: string
  toAccountId: string
  amount: string
  occurredDate: string
  occurredTime: string
}

interface TransferModalProps {
  accounts: Account[]
  saving: boolean
  maxDate: string
  onSubmit: (form: TransferForm) => Promise<void>
  onClose: () => void
}

function buildDefault(): TransferForm {
  return {
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    occurredDate: '',
    occurredTime: '',
  }
}

export default function TransferModal({
  accounts,
  saving,
  maxDate,
  onSubmit,
  onClose,
}: TransferModalProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<TransferForm>(buildDefault)

  const fromAccount = accounts.find((a) => String(a.id) === form.fromAccountId) ?? null
  const toAccount = accounts.find((a) => String(a.id) === form.toAccountId) ?? null
  const currency = fromAccount?.currency ?? null

  const eligibleDestinations = accounts.filter(
    (a) => String(a.id) !== form.fromAccountId && (!currency || a.currency === currency),
  )

  const autoDescription = fromAccount && toAccount
    ? `Transferencia: ${fromAccount.name} a ${toAccount.name}`
    : 'Transferencia: origen a destino'

  function handleFromChange(value: string) {
    setForm((prev) => ({
      ...prev,
      fromAccountId: value,
      toAccountId:
        prev.toAccountId && accounts.find((a) => String(a.id) === prev.toAccountId)?.currency !==
          accounts.find((a) => String(a.id) === value)?.currency
          ? ''
          : prev.toAccountId,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.fromAccountId) {
      toast('Selecciona la cuenta de origen.', 'error')
      return
    }
    if (!form.toAccountId) {
      toast('Selecciona la cuenta de destino.', 'error')
      return
    }
    if (form.fromAccountId === form.toAccountId) {
      toast('La cuenta de origen y destino deben ser diferentes.', 'error')
      return
    }
    const amount = Number(form.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      toast('El monto debe ser mayor que 0.', 'error')
      return
    }
    if (!form.occurredDate) {
      toast('Selecciona la fecha.', 'error')
      return
    }
    if (!form.occurredTime) {
      toast('Selecciona la hora.', 'error')
      return
    }

    await onSubmit(form)
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl w-full border border-neutral-100 overflow-visible">
        {/* Header */}
        <div className="bg-brand-light border-b border-brand/10 px-6 py-4 flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M3 10h14M13 6l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 14l-4-4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="app-section-title text-brand-text">Mover dinero entre cuentas</h2>
            <p className="text-sm text-neutral-700 mt-0.5">Solo puedes mover entre cuentas de la misma moneda.</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className="ml-auto -mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Origin */}
          <div className="space-y-1">
            <label className="app-label">Cuenta de origen</label>
            <Select
              value={form.fromAccountId}
              onChange={handleFromChange}
              options={[
                { value: '', label: 'Selecciona la cuenta origen' },
                ...accounts.map((a) => ({
                  value: String(a.id),
                  label: `${a.name} (${a.currency})`,
                })),
              ]}
              className="w-full"
              disabled={!accounts.length}
            />
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <label className="app-label">Cuenta de destino</label>
            <Select
              value={form.toAccountId}
              onChange={(value) => { setForm((prev) => ({ ...prev, toAccountId: value })) }}
              options={[
                {
                  value: '',
                  label: form.fromAccountId
                    ? eligibleDestinations.length
                      ? 'Selecciona la cuenta destino'
                      : `Sin cuentas ${currency ?? ''} disponibles`
                    : 'Primero elige cuenta de origen',
                },
                ...eligibleDestinations.map((a) => ({
                  value: String(a.id),
                  label: `${a.name} (${a.currency})`,
                })),
              ]}
              className="w-full"
              disabled={!form.fromAccountId || eligibleDestinations.length === 0}
            />
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="app-label">Monto</label>
            <AmountInput
              value={form.amount}
              onChange={(raw) => setForm((prev) => ({ ...prev, amount: raw }))}
              currency={currency ?? 'COP'}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="app-label">Descripción</label>
            <p className="app-control w-full min-h-11 flex items-center text-neutral-700">
              {autoDescription}
            </p>
          </div>

          {/* Date / time */}
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Fecha"
              value={form.occurredDate}
              onChange={(value) => setForm((prev) => ({ ...prev, occurredDate: value }))}
              max={maxDate}
              className="w-full"
            />
            <TimePicker
              label="Hora"
              value={form.occurredTime}
              onChange={(value) => setForm((prev) => ({ ...prev, occurredTime: value }))}
              className="w-full"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button type="submit" className="app-btn-primary" disabled={saving}>
              {saving ? 'Moviendo...' : 'Mover dinero'}
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
