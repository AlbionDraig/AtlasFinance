// Modal — wrapper accesible para diálogos.
// Usa createPortal para renderizar fuera de la jerarquía del padre, evitando
// problemas de overflow/z-index dentro de cards o tablas.
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  onClose: () => void
  children: ReactNode
  /** Max width class, default: max-w-lg */
  maxWidth?: string
}

// Selector for elements that should be reachable via Tab inside the modal.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ onClose, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  // Cerrar con Escape: convención estándar de UI accesible (WAI-ARIA dialog).
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      // Focus trap: keep Tab navigation inside the dialog so screen-reader
      // and keyboard users don't tab into the page behind the overlay.
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    // Cleanup imprescindible para no acumular listeners cuando el modal se desmonta.
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Auto-focus the first focusable element on open and restore focus to the
  // previously-active element on close. This mirrors native <dialog> behaviour.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    focusable?.[0]?.focus()
    return () => {
      previouslyFocused?.focus?.()
    }
  }, [])

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
        <div ref={dialogRef} className="w-full">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
