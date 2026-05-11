// Select — dropdown personalizado con apertura inteligente.
// Reimplementamos en lugar de usar <select> nativo para que el estilo coincida con
// el resto del design system y para soportar abrir hacia arriba si no hay espacio abajo
// (importante en filtros dentro de modales o cards cercanas al pie de página).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
  disabled?: boolean
  visibleItems?: number
  active?: boolean
}

export default function Select({ value, onChange, options, className = '', disabled = false, visibleItems, active = false }: SelectProps) {
  const [open, setOpen] = useState(false)
  // openUpward: true cuando no hay espacio suficiente abajo y sí arriba.
  // Lo guardamos en estado para que el primer render del dropdown ya use la posición correcta
  // y evitar el "salto" visual de re-medir después del mount.
  const [openUpward, setOpenUpward] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  const menuMaxHeight = visibleItems ? visibleItems * 36 + 8 : 208

  useLayoutEffect(() => {
    if (!open || !ref.current) return

    const updatePosition = () => {
      if (!ref.current) return

      const rect = ref.current.getBoundingClientRect()
      const viewportMargin = 8
      const gap = 6
      const estimatedHeight = Math.min(options.length * 36 + 8, menuMaxHeight)
      const shouldOpenUpward = window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight

      setOpenUpward(shouldOpenUpward)
      setMenuPosition({
        top: shouldOpenUpward ? Math.max(viewportMargin, rect.top - gap) : Math.min(window.innerHeight - viewportMargin, rect.bottom + gap),
        left: Math.max(viewportMargin, rect.left),
        width: rect.width,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, options.length, menuMaxHeight])

  // Cierre al click-outside: convención de UX para popovers/dropdowns.
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Si options está vacío evitamos que el componente se rompa: mostramos placeholder sin error.
  const selected = options.find(o => o.value === value) ?? options[0] ?? { value: '', label: 'Sin opciones' }
  const isDisabled = disabled || options.length === 0

  function handleOpen() {
    if (isDisabled) return
    setOpen(prev => !prev)
  }

  return (
    <div ref={ref} className={`relative ${open ? 'z-[260]' : 'z-10'} isolate [transform:translateZ(0)] [backface-visibility:hidden] ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={isDisabled}
        data-testid="select-trigger"
        className={`flex items-center justify-between gap-2 text-xs [transform:translateZ(0)] [backface-visibility:hidden] transition-colors ${
          isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
        } ${
          active
            ? 'app-control border-brand bg-brand-light text-brand-text'
            : 'app-control'
        }`}
      >
        <span className="truncate whitespace-nowrap">{selected.label}</span>
        <svg
          className={`w-3.5 h-3.5 app-subtitle transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && !isDisabled && createPortal(
        <ul
          ref={menuRef}
          data-testid="select-menu"
          className="app-menu fixed z-[400] overflow-y-auto py-1 text-xs"
          style={{
            top: openUpward ? 'auto' : `${menuPosition.top}px`,
            bottom: openUpward ? `${Math.max(8, window.innerHeight - menuPosition.top)}px` : 'auto',
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
            maxHeight: `${menuMaxHeight}px`,
          }}
        >
          {options.map(opt => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                data-testid={`select-option-${opt.value}`}
                data-value={opt.value}
                className={`w-full text-left px-3 py-2 transition-colors cursor-pointer
                  ${opt.value === value
                    ? 'bg-tone-neutral text-[var(--af-accent)]'
                    : 'hover:bg-[var(--af-surface-alt)] text-[var(--af-text)]'
                  }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}
