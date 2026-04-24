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
}

export default function Select({ value, onChange, options, className = '' }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value) ?? options[0]

  return (
    <div ref={ref} className={`relative ${open ? 'z-[120]' : 'z-10'} isolate [transform:translateZ(0)] [backface-visibility:hidden] ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex h-10 items-center justify-between gap-2 w-full px-3 text-xs rounded-lg
          border border-slate-700 bg-slate-900 text-slate-200
          hover:bg-slate-800
          focus:outline-none focus:ring-2 focus:ring-indigo-500/50
          transition-[background-color] cursor-pointer [transform:translateZ(0)] [backface-visibility:hidden]"
      >
        <span className="truncate whitespace-nowrap">{selected.label}</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          className="absolute right-0 mt-1.5 w-full z-[130] overflow-hidden rounded-lg
            border border-slate-700 bg-slate-900 shadow-xl
            py-1 text-xs text-slate-200"
        >
          {options.map(opt => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full text-left px-3 py-2 transition-colors cursor-pointer
                  ${opt.value === value
                    ? 'bg-indigo-600/30 text-indigo-300'
                    : 'hover:bg-slate-800 text-slate-200'
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
