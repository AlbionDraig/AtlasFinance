import { useTranslation } from 'react-i18next'

export type ViewMode = 'cards' | 'table' | 'grid'

interface ViewOption {
  value: ViewMode
  labelKey: string
  icon: string
}

interface ViewToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  options?: ViewOption[]
}

const DEFAULT_OPTIONS: ViewOption[] = [
  { value: 'cards', labelKey: 'common.view_cards', icon: '⊞' },
  { value: 'table', labelKey: 'common.view_table', icon: '≡' },
]

const GRID_OPTIONS: ViewOption[] = [
  { value: 'grid', labelKey: 'common.view_cards', icon: '⊞' },
  { value: 'table', labelKey: 'common.view_table', icon: '≡' },
]

/**
 * Reusable view mode toggle (cards/grid vs table).
 * Renders a segmented control that matches the app's brand design.
 */
export default function ViewToggle({ value, onChange, options }: ViewToggleProps) {
  const { t } = useTranslation()
  const resolvedOptions = options ?? (value === 'grid' ? GRID_OPTIONS : DEFAULT_OPTIONS)

  return (
    <div className="inline-flex rounded-lg border border-brand/20 bg-white/80 p-0.5">
      {resolvedOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === option.value
              ? 'bg-brand text-white shadow-sm'
              : 'text-brand-text hover:bg-brand-light hover:text-brand-text'
          }`}
        >
          {option.icon} {t(option.labelKey)}
        </button>
      ))}
    </div>
  )
}
