import { useId } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  hint?: string
  className?: string
  disabled?: boolean
  valueSuffix?: string
  ariaLabel?: string
}

/**
 * Reusable slider with design-system styling and accessible labeling.
 */
export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint,
  className = '',
  disabled = false,
  valueSuffix = '',
  ariaLabel,
}: SliderProps) {
  const inputId = useId()
  const hintId = useId()
  const safeMax = max > min ? max : min + 1
  const clampedValue = Math.min(Math.max(value, min), max)
  const progress = ((clampedValue - min) / (safeMax - min)) * 100

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700">
          {label}
        </label>
        <span className="inline-flex min-w-14 items-center justify-center rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700">
          {clampedValue}{valueSuffix}
        </span>
      </div>

      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampedValue}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        aria-describedby={hint ? hintId : undefined}
        className="app-slider"
        style={{ ['--slider-percent' as string]: `${progress}%` }}
      />

      {hint && (
        <p id={hintId} className="text-xs text-neutral-400">
          {hint}
        </p>
      )}
    </div>
  )
}