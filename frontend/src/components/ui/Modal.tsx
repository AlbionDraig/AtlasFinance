// Modal — wrapper accesible para diálogos.
// Usa createPortal para renderizar fuera de la jerarquía del padre, evitando
// problemas de overflow/z-index dentro de cards o tablas.
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  onClose: () => void
  children: ReactNode
  /** Max width class, default: max-w-lg */
  maxWidth?: string
}

export default function Modal({ onClose, children, maxWidth = 'max-w-lg' }: ModalProps) {
  // Cerrar con Escape: convención estándar de UI accesible (WAI-ARIA dialog).
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    // Cleanup imprescindible para no acumular listeners cuando el modal se desmonta.
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Bloqueo de scroll del body mientras el modal está abierto: evita que el
  // contenido detrás scrollee al hacer wheel sobre el overlay.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-[200] overflow-y-auto p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay clickeable: click fuera = cerrar (UX estándar). aria-hidden lo
          excluye de la nav por screen reader, ya que es decorativo. */}
      <div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`relative z-10 mx-auto flex min-h-full w-full ${maxWidth} items-center justify-center py-6`}>
        {children}
      </div>
    </div>,
    document.body
  )
}
