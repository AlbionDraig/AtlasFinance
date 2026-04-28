import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import type { Bank } from '@/api/banks'
import type { Account } from '@/types'

interface AccountEditModalProps {
  account: Account
  banks: Bank[]
  saving: boolean
  onSubmit: (id: number, data: { name: string; account_type: 'savings' | 'checking'; currency: 'COP' | 'USD'; bank_id: number }) => void
  onClose: () => void
}

export default function AccountEditModal({ account, banks, saving, onSubmit, onClose }: AccountEditModalProps) {
  const [name, setName] = useState(account.name)
  const [accountType, setAccountType] = useState<'savings' | 'checking'>(
    account.account_type === 'checking' ? 'checking' : 'savings',
  )
  const [currency, setCurrency] = useState<'COP' | 'USD'>(
    account.currency === 'USD' ? 'USD' : 'COP',
  )
  const [bankId, setBankId] = useState(String(account.bank_id))

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2 || !bankId) return
    onSubmit(account.id, {
      name: name.trim(),
      account_type: accountType,
      currency,
      bank_id: Number(bankId),
    })
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <div className="w-full rounded-2xl bg-white border border-neutral-100 shadow-xl overflow-visible border-t-4 border-t-brand">
        <div className="bg-brand-light border-b border-brand/10 px-6 py-4 flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5zM15.71 6.29a1 1 0 000-1.41l-1.58-1.58a1 1 0 00-1.41 0l-1.24 1.24 2.99 2.99 1.24-1.24z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h2 className="app-section-title text-brand-text">Editar cuenta</h2>
            <p className="text-sm text-neutral-700 mt-0.5">Modifica los datos de la cuenta bancaria.</p>
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
            <label className="app-label">Nombre de cuenta</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="app-control w-full"
              placeholder="Ej: Cuenta Ahorros Principal"
              autoFocus
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="app-label">Tipo</label>
              <Select
                value={accountType}
                onChange={(value) => setAccountType(value as 'savings' | 'checking')}
                options={[
                  { value: 'savings', label: 'Ahorros' },
                  { value: 'checking', label: 'Corriente' },
                ]}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="app-label">Moneda</label>
              <Select
                value={currency}
                onChange={(value) => setCurrency(value as 'COP' | 'USD')}
                options={[
                  { value: 'COP', label: 'COP' },
                  { value: 'USD', label: 'USD' },
                ]}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="app-label">Banco</label>
              <Select
                value={bankId}
                onChange={setBankId}
                options={banks.map((bank) => ({ value: String(bank.id), label: `${bank.name} (${bank.country_code})` }))}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button type="submit" className="app-btn-primary" disabled={saving || name.trim().length < 2}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
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
