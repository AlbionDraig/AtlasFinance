import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  onClose: () => void
  children: ReactNode
  /** Max width class, default: max-w-lg */
  maxWidth?: string
}

export default function Modal({ onClose, children, maxWidth = 'max-w-lg' }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`relative z-10 mx-auto flex min-h-full w-full ${maxWidth} items-center justify-center py-6`}>
        {children}
      </div>
    </div>
  )
}
