import { useState, type FormEvent } from 'react'
import Modal from '@/components/ui/Modal'
import type { Bank } from '@/api/banks'

interface BankEditModalProps {
  bank: Bank
  saving: boolean
  onSubmit: (id: number, name: string, countryCode: string) => void
  onClose: () => void
}

export default function BankEditModal({ bank, saving, onSubmit, onClose }: BankEditModalProps) {
  const [name, setName] = useState(bank.name)
  const [countryCode, setCountryCode] = useState(bank.country_code)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2) return
    onSubmit(bank.id, name.trim(), countryCode.trim().toUpperCase())
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-xl">
      <div className="w-full rounded-2xl border border-neutral-100 border-t-4 border-t-brand bg-white shadow-xl overflow-visible">
        <div className="flex items-start gap-3 border-b border-brand/10 bg-brand-light px-6 py-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5zM15.71 6.29a1 1 0 000-1.41l-1.58-1.58a1 1 0 00-1.41 0l-1.24 1.24 2.99 2.99 1.24-1.24z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h2 className="app-section-title text-brand-text">Editar banco</h2>
            <p className="mt-0.5 text-sm text-neutral-700">Modifica el nombre o el código de país del banco.</p>
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

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-1">
            <label className="app-label">Nombre del banco</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="app-control w-full"
              placeholder="Ej: Bancolombia"
              autoFocus
              maxLength={120}
            />
          </div>

          <div className="space-y-1">
            <label className="app-label">Código de país</label>
            <input
              type="text"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              className="app-control w-full"
              placeholder="Ej: CO"
              maxLength={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
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
