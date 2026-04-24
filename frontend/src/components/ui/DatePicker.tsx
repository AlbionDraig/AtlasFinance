import { useEffect, useMemo, useRef, useState } from 'react'

interface DatePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  className?: string
  disabled?: boolean
}

const WEEK_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isBetween(date: Date, min?: Date, max?: Date): boolean {
  if (min && date < min) return false
  if (max && date > max) return false
  return true
}

function buildCalendarDays(viewDate: Date): Date[] {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7
  const start = new Date(year, month, 1 - mondayOffset)

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export default function DatePicker({ label, value, onChange, min, max, className = '', disabled = false }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [openLeft, setOpenLeft] = useState(false)
  const [viewDate, setViewDate] = useState(() => parseIsoDate(value))
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedDate = useMemo(() => parseIsoDate(value), [value])
  const minDate = useMemo(() => (min ? parseIsoDate(min) : undefined), [min])
  const maxDate = useMemo(() => (max ? parseIsoDate(max) : undefined), [max])

  useEffect(() => {
    setViewDate(parseIsoDate(value))
  }, [value])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onDocKeyDown)
    }
  }, [])

  const days = useMemo(() => buildCalendarDays(viewDate), [viewDate])
  const monthLabel = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))

  const display = selectedDate.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className={`app-label ${disabled ? 'text-neutral-400' : ''}`}>{label}</label>

      <div ref={rootRef} className={`relative isolate [transform:translateZ(0)] [backface-visibility:hidden] ${open ? 'z-[140]' : 'z-10'}`}>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setOpen(prev => {
            if (!prev && rootRef.current) {
              const rect = rootRef.current.getBoundingClientRect()
              const popoverHeight = 320
              const popoverWidth = 288
              setOpenUpward(window.innerHeight - rect.bottom < popoverHeight && rect.top > popoverHeight)
              setOpenLeft(window.innerWidth - rect.left < popoverWidth && rect.right > popoverWidth)
            }
            return !prev
          })
        }}
        className={`app-control w-36 text-left text-xs [transform:translateZ(0)] [backface-visibility:hidden] ${disabled ? 'cursor-not-allowed bg-neutral-50 border-neutral-100 text-neutral-700' : ''}`}
      >
        <span className="inline-flex w-full items-center gap-2 whitespace-nowrap">
          <svg className="h-3.5 w-3.5 app-subtitle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="truncate">{display}</span>
          {disabled && (
            <svg className="h-3 w-3 text-neutral-400 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="10" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          )}
        </span>
      </button>

      {open && !disabled && (
        <div className={['app-menu absolute z-[150] w-72 p-3', openUpward ? 'bottom-full mb-2' : 'top-full mt-2', openLeft ? 'right-0' : 'left-0'].join(' ')}>
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md border border-[var(--af-border)] bg-[var(--af-surface-alt)] px-2 py-1 text-xs app-subtitle hover:bg-[var(--af-bg-soft)]"
              aria-label="Mes anterior"
            >
              {'<'}
            </button>
            <p className="text-sm font-semibold capitalize text-[var(--af-text)]">{monthLabel}</p>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md border border-[var(--af-border)] bg-[var(--af-surface-alt)] px-2 py-1 text-xs app-subtitle hover:bg-[var(--af-bg-soft)]"
              aria-label="Mes siguiente"
            >
              {'>'}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEK_DAYS.map(day => (
              <div key={day} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider app-subtitle">
                {day}
              </div>
            ))}

            {days.map(day => {
              const inCurrentMonth = day.getMonth() === viewDate.getMonth()
              const disabled = !isBetween(day, minDate, maxDate)
              const selected = isSameDay(day, selectedDate)

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(toIsoDate(day))
                    setOpen(false)
                  }}
                  className={[
                    'h-8 rounded-md text-xs transition-colors',
                    selected ? 'bg-[var(--af-accent)] text-white' : '',
                    !selected && inCurrentMonth ? 'text-[var(--af-text)] hover:bg-[var(--af-surface-alt)]' : '',
                    !selected && !inCurrentMonth ? 'text-[var(--af-text-soft)] hover:bg-[var(--af-surface-alt)]' : '',
                    disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : '',
                  ].join(' ')}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
