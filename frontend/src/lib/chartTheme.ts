// Shared chart tokens aligned with the global app palette (CSS variables in index.css).
export const CHART_PALETTE = [
  'var(--af-accent)',
  'var(--af-accent-deep)',
  'var(--af-positive)',
  'var(--af-warning)',
  'var(--af-accent-soft-text)',
  'var(--af-text-muted)',
  'var(--af-text-soft)',
  'var(--af-text)',
]

export const CHART_INCOME = 'var(--af-positive)'
export const CHART_EXPENSE = 'var(--af-warning)'
export const CHART_SAVINGS = 'var(--af-accent)'
export const CHART_NEUTRAL = 'var(--af-text-soft)'

export const CHART_TICK = 'var(--af-text-muted)'
export const CHART_GRID = 'var(--af-border)'
export const CHART_LEGEND = 'var(--af-text-muted)'

// Account / pocket color rotation (cyclic by index)
export const ACCOUNT_BASE_COLORS: Array<{ accent: string; softText: string }> = [
  { accent: 'var(--af-accent)',       softText: 'var(--af-accent-soft-text)' },
  { accent: 'var(--af-positive)',     softText: 'var(--af-positive-soft-text)' },
  { accent: 'var(--af-warning)',      softText: 'var(--af-negative-soft-text)' },
  { accent: 'var(--af-accent-deep)',  softText: 'var(--af-accent-deep)' },
]

// Investment instrument badge colors (Tailwind classes)
export const INSTRUMENT_COLORS: Record<string, { bg: string; text: string }> = {
  Acciones: { bg: 'bg-brand-light',   text: 'text-brand-text' },
  Fondos:   { bg: 'bg-success-bg',    text: 'text-success-text' },
  Bonos:    { bg: 'bg-warning-bg',    text: 'text-warning-text' },
  CDT:      { bg: 'bg-neutral-100',   text: 'text-neutral-700' },
  ETF:      { bg: 'bg-brand-light',   text: 'text-brand-text' },
  Cripto:   { bg: 'bg-warning-bg',    text: 'text-warning-text' },
  Otro:     { bg: 'bg-neutral-100',   text: 'text-neutral-700' },
}

export const INSTRUMENT_PROGRESS_COLORS: Record<string, string> = {
  Acciones: 'bg-brand',
  Fondos: 'bg-success',
  Bonos: 'bg-warning',
  CDT: 'bg-neutral-700',
  ETF: 'bg-brand-deep',
  Cripto: 'bg-warning',
  Otro: 'bg-neutral-400',
}

// CSS-var fill colors for recharts cells — one per instrument type
export const INSTRUMENT_FILL_COLORS: Record<string, string> = {
  Acciones: 'var(--af-accent)',
  Fondos:   'var(--af-positive)',
  Bonos:    'var(--af-warning)',
  CDT:      'var(--af-text-soft)',
  ETF:      'var(--af-accent-deep)',
  Cripto:   '#8a5200',
  Otro:     'var(--af-text-muted)',
}

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--af-surface)',
    border: '1px solid var(--af-border)',
    borderRadius: '0.5rem',
    color: 'var(--af-text)',
    fontSize: 12,
    boxShadow: 'var(--af-shadow-md)',
  },
}
