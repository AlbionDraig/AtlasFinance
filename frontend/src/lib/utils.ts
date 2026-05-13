import { AxiosError } from 'axios'

const LEGACY_SEED_DESCRIPTION_PATTERN = /^\[seed-state\]\s*([a-z_]+)\s*-\s*(.*)$/i

const LEGACY_SEED_DESCRIPTION_BY_CODE = {
  zero_progress: {
    es: 'Sin ahorro acumulado y con fecha objetivo lejana.',
    en: 'No savings accumulated yet with a distant target date.',
  },
  partial_25: {
    es: 'Progreso parcial con una fecha objetivo de plazo medio.',
    en: 'Partial progress with a medium-term target date.',
  },
  partial_90_urgent: {
    es: 'Casi completada y con fecha objetivo urgente.',
    en: 'Almost complete with an urgent target date.',
  },
  exact_completed: {
    es: 'Meta alcanzada exactamente en el monto objetivo.',
    en: 'Goal reached exactly at the target amount.',
  },
  over_completed: {
    es: 'Meta sobrecumplida, el progreso visual se limita a 100%.',
    en: 'Overfunded goal, visual progress is capped at 100%.',
  },
  due_today: {
    es: 'La fecha objetivo corresponde al dia de hoy.',
    en: 'The target date is today.',
  },
  overdue: {
    es: 'La fecha objetivo ya paso y la meta esta vencida.',
    en: 'The target date has passed and the goal is overdue.',
  },
  pocket_linked: {
    es: 'El monto ahorrado se toma automaticamente del saldo del bolsillo vinculado.',
    en: 'Saved amount is automatically taken from the linked pocket balance.',
  },
} as const

/** Format numeric value as localized currency for dashboard and tables. */
export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

/** Extract API detail message from Axios errors and fallback to a safe message. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return fallback
}

/** Normalize legacy technical seed descriptions into user-facing localized text. */
export function formatSavingsGoalDescription(
  description: string | null | undefined,
  language: string,
): string | null {
  if (!description) return null

  const match = description.match(LEGACY_SEED_DESCRIPTION_PATTERN)
  if (!match) return description

  const code = match[1].toLowerCase() as keyof typeof LEGACY_SEED_DESCRIPTION_BY_CODE
  const legacyFallback = match[2]?.trim()
  const locale = language.startsWith('es') ? 'es' : 'en'
  const mapped = LEGACY_SEED_DESCRIPTION_BY_CODE[code]

  if (mapped) {
    return mapped[locale]
  }

  return legacyFallback || null
}
