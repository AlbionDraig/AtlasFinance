import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  ariaLabel?: string
  widthClassName?: string
}

function widthPxFromClass(widthClassName: string): number {
  const match = /^w-(\d+)$/.exec(widthClassName.trim())
  if (!match) return 176
  return Number(match[1]) * 4
}

export default function Tooltip({
  content,
  children,
  ariaLabel,
  widthClassName = 'w-44',
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [tooltipPos, setTooltipPos] = useState({
    top: 0,
    left: 0,
    arrowLeft: 24,
    placement: 'top' as 'top' | 'bottom',
    maxWidth: 176,
  })

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) return

    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return

      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tipRect = tooltipRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const margin = 8
      const gap = 8
      const minMaxWidth = 140
      const widthFromClass = widthPxFromClass(widthClassName)
      const estimatedWidth = Math.min(widthFromClass, tipRect.width || widthFromClass)

      // Primero, calcular el left centrado basado en el ancho estimado
      let left = triggerRect.left + triggerRect.width / 2 - estimatedWidth / 2
      
      // Ajustar si se sale de los bordes del viewport
      left = Math.max(margin, Math.min(left, viewportWidth - estimatedWidth - margin))

      let placement: 'top' | 'bottom' = 'top'
      let top = triggerRect.top - tipRect.height - gap

      if (top < margin) {
        placement = 'bottom'
        top = triggerRect.bottom + gap
      }

      if (top + tipRect.height > viewportHeight - margin) {
        top = Math.max(margin, viewportHeight - tipRect.height - margin)
      }

      let arrowLeft = triggerRect.left + triggerRect.width / 2 - left
      arrowLeft = Math.max(12, Math.min(arrowLeft, estimatedWidth - 12))

      // Calcular max-width dinámico: el ancho normal es estimatedWidth,
      // pero se reduce si el tooltip está cerca del borde derecho
      const spaceToRight = viewportWidth - left - margin
      const maxWidth = Math.min(estimatedWidth, Math.max(minMaxWidth, spaceToRight))

      setTooltipPos({ top, left, arrowLeft, placement, maxWidth })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, widthClassName])

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        className="rounded-full focus:outline-none focus-visible:ring-1 focus-visible:ring-brand"
        aria-label={ariaLabel}
      >
        {children}
      </button>

      {open && createPortal(
        <span
          ref={tooltipRef}
          className="fixed z-50 bg-neutral-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl leading-relaxed pointer-events-none whitespace-normal"
          style={{ 
            top: tooltipPos.top, 
            left: tooltipPos.left,
            maxWidth: `${tooltipPos.maxWidth}px`
          }}
        >
          {content}
          <span
            className={`absolute border-4 border-transparent ${tooltipPos.placement === 'top' ? 'top-full border-t-neutral-900' : 'bottom-full border-b-neutral-900'}`}
            style={{ left: tooltipPos.arrowLeft, transform: 'translateX(-50%)' }}
          />
        </span>,
        document.body
      )}
    </span>
  )
}