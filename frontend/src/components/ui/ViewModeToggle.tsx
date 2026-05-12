interface ViewModeToggleOption<TMode extends string> {
  value: TMode
  label: string
}

interface ViewModeToggleProps<TMode extends string> {
  value: TMode
  options: ReadonlyArray<ViewModeToggleOption<TMode>>
  onChange: (mode: TMode) => void
  className?: string
}

/**
 * Reusable segmented control to switch list visualization modes.
 */
export default function ViewModeToggle<TMode extends string>({
  value,
  options,
  onChange,
  className = '',
}: ViewModeToggleProps<TMode>) {
  return (
    <div className={`inline-flex rounded-lg border border-brand/20 bg-white/80 p-0.5 ${className}`.trim()}>
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${isActive ? 'bg-brand text-white shadow-sm' : 'text-brand-text hover:bg-brand-light hover:text-brand-text'}`}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}