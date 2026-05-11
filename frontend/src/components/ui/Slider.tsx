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
  size?: 'sm' | 'md'
  showTicks?: boolean
  tickStep?: number
}

function buildTicks(min: number, max: number, step: number): number[] {
  if (max <= min || step <= 0) return [min, max]

  const ticks: number[] = []
  let current = min
  const safeLimit = 200

  for (let i = 0; i < safeLimit && current <= max; i += 1) {
    ticks.push(Number(current.toFixed(4)))
    current += step
  }

  if (ticks[ticks.length - 1] !== max) {
    ticks.push(max)
  }

  return ticks
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
  size = 'md',
  showTicks = false,
  tickStep,
}: SliderProps) {
  const inputId = useId()
  const hintId = useId()
  const safeMax = max > min ? max : min + 1
  const clampedValue = Math.min(Math.max(value, min), max)
  const progress = ((clampedValue - min) / (safeMax - min)) * 100
  const resolvedTickStep = tickStep && tickStep > 0
    ? tickStep
    : Math.max(step, Math.ceil((safeMax - min) / 4))
  const ticks = showTicks ? buildTicks(min, max, resolvedTickStep) : []
  const sliderSizeClass = size === 'sm' ? 'app-slider-sm' : 'app-slider-md'

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className={`block font-medium text-neutral-700 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {label}
        </label>
        <span className={`inline-flex min-w-14 items-center justify-center rounded-md border border-neutral-100 bg-neutral-50 px-2 font-medium text-neutral-700 ${size === 'sm' ? 'py-0.5 text-[11px]' : 'py-1 text-xs'}`}>
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
        className={`app-slider ${sliderSizeClass}`}
        style={{ ['--slider-percent' as string]: `${progress}%` }}
      />

      {showTicks && ticks.length > 1 && (
        <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
          {ticks.map((tick) => (
            <span key={tick} className="select-none">
              {tick}{valueSuffix}
            </span>
          ))}
        </div>
      )}

      {hint && (
        <p id={hintId} className="text-xs text-neutral-400">
          {hint}
        </p>
      )}
    </div>
  )
}