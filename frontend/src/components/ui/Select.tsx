import { useEffect, useRef, useState } from 'react'

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
}

export default function Select({ value, onChange, options, className = '', disabled = false }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value) ?? options[0] ?? { value: '', label: 'Sin opciones' }
  const isDisabled = disabled || options.length === 0

  function handleOpen() {
    if (isDisabled) return
    setOpen(prev => {
      if (!prev && ref.current) {
        const rect = ref.current.getBoundingClientRect()
        const estimatedHeight = Math.min(options.length * 36 + 8, 208)
        setOpenUpward(window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight)
      }
      return !prev
    })
  }

  return (
    <div ref={ref} className={`relative ${open ? 'z-[120]' : 'z-10'} isolate [transform:translateZ(0)] [backface-visibility:hidden] ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={isDisabled}
        className={`app-control flex items-center justify-between gap-2 text-xs [transform:translateZ(0)] [backface-visibility:hidden] ${
          isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
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
      {open && !isDisabled && (
        <ul
          className={['app-menu absolute right-0 w-full z-[130] max-h-52 overflow-y-auto py-1 text-xs', openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'].join(' ')}
        >
          {options.map(opt => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
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
        </ul>
      )}
    </div>
  )
}
