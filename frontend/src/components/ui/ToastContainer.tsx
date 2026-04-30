// ToastContainer — renderiza la cola de toasts del ToastProvider.
// Va fuera del Router para que las notificaciones sobrevivan a la navegación
// (ej. crear una transacción y navegar mientras se muestra el confirm).
import { useEffect, useRef, useState } from 'react'
import { useToast, type Toast } from '@/hooks/useToast'

// Duración total del toast (ms). 4.5s permite leer mensajes cortos sin sentirse intrusivo.
const DURATION = 4500

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  // visible controla la animación de entrada (slide+fade) vía clases condicionales.
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(100)
  // startRef guarda el timestamp inicial del rAF; usar ref evita re-renders por cada frame.
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const isError = toast.variant === 'error'

  // Animación de entrada: aplicamos `visible=true` en el siguiente frame para que la
  // transición CSS (translate/opacity) detecte el cambio y la anime.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  // Barra de progreso: usamos requestAnimationFrame en vez de setInterval para sincronizar
  // con el refresh de pantalla y evitar saltos visuales bajo carga.
  useEffect(() => {
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now
      const elapsed = now - startRef.current
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setProgress(remaining)
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      // Cancelar el frame al desmontar evita warnings de "setState on unmounted".
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const accentColor = isError ? 'var(--af-accent)' : 'var(--af-positive)'

  return (
    <div
      role="alert"
      className={`relative overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.10)] border border-neutral-100 transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
    >
      {/* Colored left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: accentColor }}
      />

      {/* Content */}
      <div className="flex items-start gap-3 pl-4 pr-3 pt-3 pb-3 ml-1">
        {/* Icon badge */}
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: isError ? 'var(--af-accent-soft)' : 'var(--af-positive-soft)' }}
        >
          {isError ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke={accentColor} strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke={accentColor} strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-neutral-900 leading-snug">
            {isError ? 'Ha ocurrido un error' : 'Operación exitosa'}
          </p>
          <p className="mt-0.5 text-xs text-neutral-700 leading-relaxed">{toast.message}</p>
        </div>

        {/* Close */}
        <button
          type="button"
          aria-label="Cerrar notificación"
          onClick={() => onDismiss(toast.id)}
          className="ml-1 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-neutral-100">
        <div
          className="h-full transition-none"
          style={{
            width: `${progress}%`,
            backgroundColor: accentColor,
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-5 z-[500] flex w-80 flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  )
}
