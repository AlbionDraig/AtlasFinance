interface ViewModeOption<T extends string> {
  value: T
  label: string
}

interface ViewModeToggleProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: ViewModeOption<T>[]
}

/**
 * Reusable toggle component for switching between display modes (e.g. cards/table, grid/table).
 */
export default function ViewModeToggle<T extends string>({ value, onChange, options }: ViewModeToggleProps<T>) {
  return (
    <div className="inline-flex rounded-lg border border-brand/20 bg-white/80 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === option.value
              ? 'bg-brand text-white shadow-sm'
              : 'text-brand-text hover:bg-brand-light hover:text-brand-text'
          }`}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
