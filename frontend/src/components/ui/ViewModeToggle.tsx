interface ViewModeOption {
  value: string
  label: string
}

interface ViewModeToggleProps {
  value: string
  options: ViewModeOption[]
  onChange: (value: string) => void
  className?: string
}

/**
 * Reusable segmented toggle for switching between list rendering modes.
 */
export default function ViewModeToggle({ value, options, onChange, className = '' }: ViewModeToggleProps) {
  return (
    <div className={`inline-flex rounded-lg border border-brand/20 bg-white/80 p-0.5 ${className}`.trim()} role="group" aria-label="View mode selector">
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-brand text-white shadow-sm'
                : 'text-brand-text hover:bg-brand-light hover:text-brand-text'
            }`}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
