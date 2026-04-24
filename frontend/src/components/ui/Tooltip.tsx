import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  ariaLabel?: string
  widthClassName?: string
}

export default function Tooltip({
  content,
  children,
  ariaLabel,
  widthClassName = 'w-56',
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [tooltipPos, setTooltipPos] = useState({
    top: 0,
    left: 0,
    arrowLeft: 24,
    placement: 'top' as 'top' | 'bottom',
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

      let left = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2
      left = Math.max(margin, Math.min(left, viewportWidth - tipRect.width - margin))

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
      arrowLeft = Math.max(12, Math.min(arrowLeft, tipRect.width - 12))

      setTooltipPos({ top, left, arrowLeft, placement })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

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

      {open && (
        <span
          ref={tooltipRef}
          className={`fixed z-50 ${widthClassName} max-w-[calc(100vw-1rem)] bg-neutral-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl leading-relaxed pointer-events-none whitespace-normal`}
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          {content}
          <span
            className={`absolute border-4 border-transparent ${tooltipPos.placement === 'top' ? 'top-full border-t-neutral-900' : 'bottom-full border-b-neutral-900'}`}
            style={{ left: tooltipPos.arrowLeft, transform: 'translateX(-50%)' }}
          />
        </span>
      )}
    </span>
  )
}