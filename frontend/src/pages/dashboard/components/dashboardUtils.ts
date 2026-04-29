import {
  CHART_PALETTE,
  CHART_INCOME,
  CHART_EXPENSE,
  CHART_SAVINGS,
  CHART_NEUTRAL,
  CHART_TICK,
  CHART_GRID,
  CHART_LEGEND,
  CHART_TOOLTIP_STYLE,
} from '@/lib/chartTheme'

// ─── Types ────────────────────────────────────────────────────────────────────
export type Period = 'Año actual' | 'Últimos 90 días' | 'Últimos 30 días' | 'Personalizado'
export type Tone = 'positive' | 'negative' | 'flat' | 'neutral'
export type BadgeVariant = 'brand' | 'success' | 'warning' | 'neutral'

// ─── Date helpers ─────────────────────────────────────────────────────────────
export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function clampISO(value: string, min: string, max: string): string {
  if (value < min) return min
  if (value > max) return max
  return value
}

export function fmtMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}

export function computeDates(period: Period, from: string, to: string): { dateFrom: Date; dateTo: Date } {
  const today = new Date()
  if (period === 'Año actual')
    return { dateFrom: new Date(today.getFullYear(), 0, 1), dateTo: new Date(today.getFullYear(), 11, 31) }
  if (period === 'Últimos 90 días')
    return { dateFrom: new Date(today.getTime() - 89 * 86400000), dateTo: today }
  if (period === 'Últimos 30 días')
    return { dateFrom: new Date(today.getTime() - 29 * 86400000), dateTo: today }
  return { dateFrom: new Date(from), dateTo: new Date(to) }
}

export function computePrevDates(period: Period, dateFrom: Date, dateTo: Date): { prevFrom: Date; prevTo: Date } {
  if (period === 'Año actual') {
    const y = dateFrom.getFullYear()
    return { prevFrom: new Date(y - 1, 0, 1), prevTo: new Date(y - 1, 11, 31) }
  }
  const days = Math.max(Math.round((dateTo.getTime() - dateFrom.getTime()) / 86400000) + 1, 1)
  const prevTo = new Date(dateFrom.getTime() - 86400000)
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86400000)
  return { prevFrom, prevTo }
}

// ─── Number / format helpers ──────────────────────────────────────────────────
export const PALETTE = CHART_PALETTE
export { CHART_INCOME, CHART_EXPENSE, CHART_SAVINGS, CHART_NEUTRAL }

export function fmt(v: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v)
}

export function fmtShort(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v))
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function fmtDateNumeric(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function deltaBadge(curr: number, prev: number, inverse = false): { text: string; tone: Tone } {
  if (prev === 0) return { text: curr === 0 ? '0%' : 'primer período', tone: 'flat' }
  const pct = ((curr - prev) / prev) * 100
  const isGood = inverse ? pct < 0 : pct > 0
  const tone: Tone = pct === 0 ? 'flat' : isGood ? 'positive' : 'negative'
  return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, tone }
}

export function deltaPointsBadge(curr: number, prev: number, hasPrev: boolean): { text: string; tone: Tone } {
  if (!hasPrev) return { text: 'primer período', tone: 'flat' }
  const d = curr - prev
  return { text: `${d > 0 ? '+' : ''}${d.toFixed(1)} pp`, tone: d === 0 ? 'flat' : d > 0 ? 'positive' : 'negative' }
}

export function toneFn(v: number): Tone {
  return v > 0 ? 'positive' : v < 0 ? 'negative' : 'flat'
}

export function toneToVariant(tone: Tone, fallback: BadgeVariant = 'neutral'): BadgeVariant {
  if (tone === 'positive') return 'success'
  if (tone === 'negative') return 'brand'
  return fallback
}

// ─── Recharts helpers ─────────────────────────────────────────────────────────
export const fmtTT = (v: unknown) => fmtShort(Number(v ?? 0))

export const fmtTTPair = (
  v: unknown,
  name: unknown,
  item: { payload?: { name?: string } },
): [string, string] => [fmtShort(Number(v ?? 0)), item.payload?.name ?? String(name ?? 'Monto')]

export { CHART_TICK, CHART_GRID, CHART_LEGEND }
export const TTStyle = CHART_TOOLTIP_STYLE
