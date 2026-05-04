// AmountInput — input de montos con formato "thousand-separator" en vivo.
// El reto: mantener el cursor del usuario sobre el dígito correcto cuando se
// inserta/elimina una coma de miles automáticamente. Por eso trabajamos con
// dos representaciones (raw vs display) y mapeamos la posición del caret entre ambas.
import { useState, useEffect, useRef } from 'react'
import type { KeyboardEvent, ClipboardEvent } from 'react'

// Símbolos por moneda. COP usa $ porque visualmente es más familiar para usuarios
// colombianos que "COP"; el código se muestra en otros lugares para evitar ambigüedad.
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  COP: '$',
  EUR: '€',
  GBP: '£',
}

interface AmountInputProps {
  value: string                      // raw numeric string, dot as decimal (e.g. "1250000.50")
  onChange: (raw: string) => void    // called with raw string on every change
  currency?: string                  // e.g. "COP", "USD" — shows symbol prefix
  className?: string
  placeholder?: string
  disabled?: boolean
}

/** Format a raw number string (dot = decimal) → comma thousands, dot decimal. e.g. "1250000.5" → "1,250,000.5" */
function formatDisplay(raw: string): string {
  if (!raw) return ''
  // Si el usuario escribe ".5" (sin entero) prefijamos 0 para no mostrar ",5" raro tras formatear.
  const normalized = raw.startsWith('.') ? '0' + raw : raw
  const parts = normalized.split('.')
  // Regex estándar para insertar separador de miles cada 3 dígitos desde la derecha.
  const intFormatted = (parts[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.length > 1 ? intFormatted + '.' + parts[1] : intFormatted
}

// Mapea posición del caret en el string mostrado (con comas) a la posición en el raw.
// Las comas no cuentan como caracteres en el raw, así que las saltamos.
function displayToRawCursor(displayCursor: number, display: string): number {
  let raw = 0
  for (let i = 0; i < displayCursor && i < display.length; i++) {
    if (display[i] !== ',') raw++
  }
  return raw
}

// Inverso: dada una posición raw, calcula la posición en el display sumando las comas que la preceden.
function rawToDisplayCursor(rawCursor: number, display: string): number {
  let raw = 0
  let disp = 0
  while (raw < rawCursor && disp < display.length) {
    if (display[disp] !== ',') raw++
    disp++
  }
  return disp
}

export default function AmountInput({
  value,
  onChange,
  currency,
  className = '',
  placeholder = '0.00',
  disabled = false,
}: AmountInputProps) {
  const symbol = currency ? (CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency) : null
  const inputRef = useRef<HTMLInputElement>(null)
  const skipSyncRef = useRef(false)
  const [display, setDisplay] = useState(() => formatDisplay(value))

  useEffect(() => {
    if (!skipSyncRef.current) {
      setDisplay(formatDisplay(value))
    }
  }, [value])

  function applyRaw(newRaw: string, newRawCursor: number) {
    const dotIdx = newRaw.indexOf('.')
    const clamped =
      dotIdx !== -1 && newRaw.length - dotIdx - 1 > 2
        ? newRaw.slice(0, dotIdx + 3)
        : newRaw
    const newDisplay = formatDisplay(clamped)
    const clampedCursor = Math.min(newRawCursor, clamped.length)
    const dispCursor = rawToDisplayCursor(clampedCursor, newDisplay)

    skipSyncRef.current = true
    setDisplay(newDisplay)
    onChange(clamped)
    requestAnimationFrame(() => {
      skipSyncRef.current = false
      inputRef.current?.setSelectionRange(dispCursor, dispCursor)
    })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const key = e.key
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab', 'Enter'].includes(key)) return
    if (e.ctrlKey || e.metaKey) return

    e.preventDefault()

    const input = e.currentTarget
    const selStart = input.selectionStart ?? 0
    const selEnd = input.selectionEnd ?? selStart
    const rawStart = displayToRawCursor(selStart, display)
    const rawEnd = displayToRawCursor(selEnd, display)

    if (key === 'Backspace') {
      if (rawStart !== rawEnd) {
        applyRaw(value.slice(0, rawStart) + value.slice(rawEnd), rawStart)
      } else if (rawStart > 0) {
        applyRaw(value.slice(0, rawStart - 1) + value.slice(rawStart), rawStart - 1)
      }
    } else if (key === 'Delete') {
      if (rawStart !== rawEnd) {
        applyRaw(value.slice(0, rawStart) + value.slice(rawEnd), rawStart)
      } else if (rawStart < value.length) {
        applyRaw(value.slice(0, rawStart) + value.slice(rawStart + 1), rawStart)
      }
    } else if (key === '.') {
      if (!value.includes('.')) {
        applyRaw(value.slice(0, rawStart) + '.' + value.slice(rawEnd), rawStart + 1)
      }
    } else if (/^[0-9]$/.test(key)) {
      const dotIdx = value.indexOf('.')
      if (dotIdx !== -1 && rawStart >= dotIdx + 1 && value.length - dotIdx - 1 >= 2 && rawStart === rawEnd) return
      applyRaw(value.slice(0, rawStart) + key + value.slice(rawEnd), rawStart + 1)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const clean = text.replace(/,/g, '').replace(/[^0-9.]/g, '')
    const parts = clean.split('.')
    const newRaw = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('').slice(0, 2) : '')
    skipSyncRef.current = true
    setDisplay(formatDisplay(newRaw))
    onChange(newRaw)
    requestAnimationFrame(() => { skipSyncRef.current = false })
  }

  if (!symbol) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={() => { /* controlled via onKeyDown */ }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        disabled={disabled}
        className={`app-control [transform:translateZ(0)] [backface-visibility:hidden] ${className}`}
        placeholder={placeholder}
      />
    )
  }

  return (
    <div
      className={[
        'app-control flex items-center p-0 [transform:translateZ(0)] [backface-visibility:hidden]',
        disabled ? 'cursor-not-allowed opacity-70' : 'cursor-text',
        className,
      ].join(' ')}
    >
      <span className="pointer-events-none flex h-full w-10 shrink-0 items-center justify-center text-sm font-medium text-[var(--af-text-muted)]">
        {symbol}
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={() => { /* controlled via onKeyDown */ }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        disabled={disabled}
        className="h-full min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-[var(--af-text)] placeholder:text-[var(--af-text-soft)]"
        style={{ outline: 'none', boxShadow: 'none' }}
        placeholder={placeholder}
      />
      {currency && (
        <span className="pointer-events-none flex h-full w-14 shrink-0 items-center justify-center pr-1 text-xs font-medium tracking-wide text-[var(--af-text-muted)]">
          {currency.toUpperCase()}
        </span>
      )}
    </div>
  )
}
