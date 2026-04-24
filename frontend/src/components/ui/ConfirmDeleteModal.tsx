import Modal from './Modal'

interface ConfirmDeleteModalProps {
  title?: string
  description?: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDeleteModal({
  title = 'Eliminar movimiento',
  description = 'Esta acción no se puede deshacer. El movimiento será eliminado permanentemente.',
  confirmLabel = 'Sí, eliminar',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div className="w-full rounded-2xl bg-white border border-neutral-100 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-neutral-100 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-neutral-900">{title}</h2>
            <p className="mt-0.5 text-xs text-neutral-700 leading-relaxed">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-neutral-100 px-3.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-60"
          >
            {loading && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
