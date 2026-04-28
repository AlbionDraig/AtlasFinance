import { useState, type FormEvent } from 'react'
import Modal from '@/components/ui/Modal'

interface CountryCreateModalProps {
  saving: boolean
  onSubmit: (name: string, code: string) => void
  onClose: () => void
}

export default function CountryCreateModal({ saving, onSubmit, onClose }: CountryCreateModalProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = name.trim()
    const normalizedCode = code.trim().toUpperCase()
    if (normalizedName.length < 2 || normalizedCode.length < 2) return
    onSubmit(normalizedName, normalizedCode)
  }

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
            <h2 className="app-section-title text-brand-text">Crear país</h2>
            <p className="mt-0.5 text-sm text-neutral-700">Agrega un nuevo país para el catálogo administrativo.</p>
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
            <label className="app-label">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="app-control w-full"
              placeholder="Ej: Colombia"
              autoFocus
              maxLength={120}
            />
          </div>

          <div className="space-y-1">
            <label className="app-label">Código</label>
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              className="app-control w-full"
              placeholder="Ej: CO"
              maxLength={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <button
              type="submit"
              className="app-btn-primary"
              disabled={saving || name.trim().length < 2 || code.trim().length < 2}
            >
              {saving ? 'Creando país...' : 'Crear país'}
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