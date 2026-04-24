import { useEffect, useMemo, useRef, useState } from 'react'

interface TimePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

function parseTime(value: string): { hours: number; minutes: number } {
  const [hours, minutes] = value.split(':').map(Number)
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  }
}

function toTimeValue(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatDisplay(value: string): string {
  const { hours, minutes } = parseTime(value)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index)
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index)

export default function TimePicker({ label, value, onChange, className = '', disabled = false }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [draftValue, setDraftValue] = useState(value)
  const rootRef = useRef<HTMLDivElement>(null)
  const hourColumnRef = useRef<HTMLDivElement>(null)
  const minuteColumnRef = useRef<HTMLDivElement>(null)
  const draftValueRef = useRef(draftValue)
  const valueRef = useRef(value)

  const activeValue = open ? draftValue : value
  const { hours, minutes } = useMemo(() => parseTime(activeValue), [activeValue])
  const display = useMemo(() => value ? formatDisplay(activeValue) : null, [activeValue, value])

  useEffect(() => {
    if (!open) {
      setDraftValue(value)
    }
  }, [open, value])

  useEffect(() => {
    draftValueRef.current = draftValue
  }, [draftValue])

  useEffect(() => {
    valueRef.current = value
  }, [value])

  function commitSelection() {
    onChange(draftValue)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    function onDocPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        onChange(draftValueRef.current)
        setOpen(false)
      }
    }

    function onDocKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDraftValue(valueRef.current)
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onDocPointerDown, true)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown, true)
      document.removeEventListener('keydown', onDocKeyDown)
    }
  }, [onChange, open])

  useEffect(() => {
    if (!open) return

    const rootRect = rootRef.current?.getBoundingClientRect()
    if (rootRect) {
      const estimatedPopoverHeight = 300
      const spaceBelow = window.innerHeight - rootRect.bottom
      const spaceAbove = rootRect.top
      setOpenUpward(spaceBelow < estimatedPopoverHeight && spaceAbove > spaceBelow)
    }

    const activeHour = hourColumnRef.current?.querySelector<HTMLButtonElement>(`[data-hour="${hours}"]`)
    const activeMinute = minuteColumnRef.current?.querySelector<HTMLButtonElement>(`[data-minute="${minutes}"]`)
    activeHour?.scrollIntoView({ block: 'center' })
    activeMinute?.scrollIntoView({ block: 'center' })
  }, [hours, minutes, open])

  function setHours(nextHours: number) {
    setDraftValue(toTimeValue(nextHours, minutes))
  }

  function setMinutes(nextMinutes: number) {
    setDraftValue(toTimeValue(hours, nextMinutes))
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className={`app-label ${disabled ? 'text-neutral-400' : ''}`}>{label}</label>

    <div ref={rootRef} className={`relative isolate [transform:translateZ(0)] [backface-visibility:hidden] ${open ? 'z-[140]' : 'z-10'}`}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return
          setOpen((current) => {
            if (current) {
              commitSelection()
              return false
            }
            setDraftValue(value)
            return true
          })
        }}
        disabled={disabled}
        className={`app-control w-full text-left [transform:translateZ(0)] [backface-visibility:hidden] ${disabled ? 'cursor-not-allowed bg-neutral-50 border-neutral-100 text-neutral-700' : ''}`}
      >
        <span className="inline-flex w-full items-center gap-2 whitespace-nowrap">
          <svg className="h-3.5 w-3.5 app-subtitle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span className={`truncate ${!display ? 'text-neutral-400' : ''}`}>{display ?? 'Selecciona una hora'}</span>
          <svg className="ml-auto h-3.5 w-3.5 app-subtitle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && !disabled && (
        <div
          className={[
            'app-menu absolute left-0 z-[150] w-64 p-3',
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2',
          ].join(' ')}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-900">Selecciona una hora</p>
            <button
              type="button"
              onClick={commitSelection}
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-hover"
            >
              Aceptar
            </button>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
            <div>
              <p className="mb-2 text-xs font-medium tracking-widest uppercase text-neutral-700">Hora</p>
              <div ref={hourColumnRef} className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-neutral-100 bg-white p-1">
                {HOUR_OPTIONS.map((option) => {
                  const selected = option === hours
                  return (
                    <button
                      key={option}
                      type="button"
                      data-hour={option}
                      onClick={() => setHours(option)}
                      className={[
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                        selected ? 'bg-brand text-white' : 'text-neutral-700 hover:bg-brand-light hover:text-brand-text',
                      ].join(' ')}
                    >
                      <span>{String(option).padStart(2, '0')}</span>
                      <span className="text-[10px] uppercase opacity-70">hr</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-center px-1 text-xl font-medium text-neutral-400">:</div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-widest uppercase text-neutral-700">Min</p>
              <div ref={minuteColumnRef} className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-neutral-100 bg-white p-1">
                {MINUTE_OPTIONS.map((option) => {
                  const selected = option === minutes
                  return (
                    <button
                      key={option}
                      type="button"
                      data-minute={option}
                      onClick={() => setMinutes(option)}
                      className={[
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                        selected ? 'bg-brand text-white' : 'text-neutral-700 hover:bg-brand-light hover:text-brand-text',
                      ].join(' ')}
                    >
                      <span>{String(option).padStart(2, '0')}</span>
                      <span className="text-[10px] uppercase opacity-70">min</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}