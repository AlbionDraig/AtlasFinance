import { useMemo, useState, type FormEvent } from 'react'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import TimePicker from '@/components/ui/TimePicker'
import { useToast } from '@/hooks/useToast'
import type { Account, Pocket } from '@/types'

interface MoveToPocketForm {
  accountId: string
  pocketId: string
  amount: string
  occurredDate: string
  occurredTime: string
}

interface MoveToPocketModalProps {
  accounts: Account[]
  pockets: Pocket[]
  saving: boolean
  maxDate: string
  onSubmit: (form: MoveToPocketForm) => Promise<void>
  onClose: () => void
}

function buildDefault(): MoveToPocketForm {
  return {
    accountId: '',
    pocketId: '',
    amount: '',
    occurredDate: '',
    occurredTime: '',
  }
}

export default function MoveToPocketModal({
  accounts,
  pockets,
  saving,
  maxDate,
  onSubmit,
  onClose,
}: MoveToPocketModalProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<MoveToPocketForm>(buildDefault)

  const account = accounts.find((item) => String(item.id) === form.accountId) ?? null
  const selectedPocket = pockets.find((item) => String(item.id) === form.pocketId) ?? null
  const accountPockets = useMemo(() => {
    if (!account) return []
    return pockets.filter((pocket) => pocket.account_id === account.id)
  }, [account, pockets])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.accountId) {
      toast('Selecciona la cuenta origen.', 'error')
      return
    }
    if (!form.pocketId) {
      toast('Selecciona el bolsillo destino.', 'error')
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
        <div className="bg-brand-light border-b border-brand/10 px-6 py-4 flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M11 7l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 6h5M4 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
            </svg>
          </div>
          <div>
            <h2 className="app-section-title text-brand-text">Mover a bolsillo</h2>
            <p className="text-sm text-neutral-700 mt-0.5">Transfiere dinero de una cuenta hacia un bolsillo de esa misma cuenta.</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="app-label">Cuenta origen</label>
            <Select
              value={form.accountId}
              onChange={(value) => setForm((prev) => ({ ...prev, accountId: value, pocketId: '' }))}
              options={[
                { value: '', label: 'Selecciona la cuenta origen' },
                ...accounts.map((item) => ({
                  value: String(item.id),
                  label: `${item.name} (${item.currency})`,
                })),
              ]}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="app-label">Bolsillo destino</label>
            <Select
              value={form.pocketId}
              onChange={(value) => setForm((prev) => ({ ...prev, pocketId: value }))}
              options={[
                {
                  value: '',
                  label: form.accountId
                    ? accountPockets.length
                      ? 'Selecciona el bolsillo'
                      : 'La cuenta no tiene bolsillos'
                    : 'Primero elige cuenta',
                },
                ...accountPockets.map((pocket) => ({
                  value: String(pocket.id),
                  label: `${pocket.name} (${pocket.currency})`,
                })),
              ]}
              className="w-full"
              disabled={!form.accountId || !accountPockets.length}
            />
          </div>

          <div className="space-y-1">
            <label className="app-label">Monto</label>
            <AmountInput
              value={form.amount}
              onChange={(raw) => setForm((prev) => ({ ...prev, amount: raw }))}
              currency={account?.currency ?? 'COP'}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="app-label">Descripción</label>
            <p className="app-control w-full min-h-11 flex items-center text-neutral-700">
              {selectedPocket ? `Movimiento a Bolsillo ${selectedPocket.name}` : 'Movimiento a Bolsillo {Bolsillo}'}
            </p>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button type="submit" className="app-btn-primary" disabled={saving}>
              {saving ? 'Moviendo...' : 'Mover a bolsillo'}
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
