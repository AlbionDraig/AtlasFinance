import type { FormEvent } from 'react'
import Modal from '@/components/ui/Modal'

interface BankCreateModalProps {
  name: string
  setName: (value: string) => void
  saving: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

export default function BankCreateModal({
  name,
  setName,
  saving,
  onSubmit,
  onClose,
}: BankCreateModalProps) {
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
            <h2 className="app-section-title text-brand-text">Crear banco</h2>
            <p className="mt-0.5 text-sm text-neutral-700">Agrega un banco disponible para asociar nuevas cuentas.</p>
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
            <label className="app-label">Nombre del banco</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="app-control w-full"
              placeholder="Ej: Bancolombia"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="app-label">País</label>
            <input
              type="text"
              value="CO"
              readOnly
              className="app-control w-full bg-neutral-50 text-neutral-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <button type="submit" className="app-btn-primary" disabled={saving}>
              {saving ? 'Creando banco...' : 'Crear banco'}
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
