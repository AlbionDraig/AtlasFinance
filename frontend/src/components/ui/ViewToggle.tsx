interface ViewToggleMode<T extends string> {
  value: T
  label: string
}

interface ViewToggleProps<T extends string> {
  modes: ViewToggleMode<T>[]
  current: T
  onChange: (value: T) => void
}

/**
 * Generic view-mode toggle button group (e.g., Cards / Table, Grid / Table).
 * Renders a pill-shaped segmented control that matches the design system brand tokens.
 */
export default function ViewToggle<T extends string>({ modes, current, onChange }: ViewToggleProps<T>) {
  return (
    <div className="inline-flex rounded-lg border border-brand/20 bg-white/80 p-0.5" role="group">
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => onChange(mode.value)}
          aria-pressed={current === mode.value}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            current === mode.value
              ? 'bg-brand text-white shadow-sm'
              : 'text-brand-text hover:bg-brand-light hover:text-brand-text'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}
