import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { metricsApi } from '@/api/metrics'
import { accountsApi } from '@/api/accounts'
import { transactionsApi } from '@/api/transactions'
import { categoriesApi, type Category } from '@/api/categories'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import type { Transaction, Account } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = 'Año actual' | 'Últimos 90 días' | 'Últimos 30 días' | 'Personalizado'
type Tone = 'positive' | 'negative' | 'flat' | 'neutral'

// ─── Date helpers ─────────────────────────────────────────────────────────────
const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}
function clampISO(value: string, min: string, max: string): string {
  if (value < min) return min
  if (value > max) return max
  return value
}
function fmtMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}
function computeDates(period: Period, from: string, to: string): { dateFrom: Date; dateTo: Date } {
  const today = new Date()
  if (period === 'Año actual')
    return { dateFrom: new Date(today.getFullYear(), 0, 1), dateTo: new Date(today.getFullYear(), 11, 31) }
  if (period === 'Últimos 90 días')
    return { dateFrom: new Date(today.getTime() - 89 * 86400000), dateTo: today }
  if (period === 'Últimos 30 días')
    return { dateFrom: new Date(today.getTime() - 29 * 86400000), dateTo: today }
  return { dateFrom: new Date(from), dateTo: new Date(to) }
}
function computePrevDates(period: Period, dateFrom: Date, dateTo: Date): { prevFrom: Date; prevTo: Date } {
  if (period === 'Año actual') {
    const y = dateFrom.getFullYear()
    return { prevFrom: new Date(y - 1, 0, 1), prevTo: new Date(y - 1, 11, 31) }
  }
  const days = Math.max(Math.round((dateTo.getTime() - dateFrom.getTime()) / 86400000) + 1, 1)
  const prevTo = new Date(dateFrom.getTime() - 86400000)
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86400000)
  return { prevFrom, prevTo }
}

// ─── Number helpers ───────────────────────────────────────────────────────────
const PALETTE = ['#ca0b0b','#5f0404','#0f7a55','#c47a00','#8a0808','#4a4845','#b0aeab','#1c1b1a']
const CHART_INCOME = '#0f7a55'
const CHART_EXPENSE = '#c47a00'
const CHART_SAVINGS = '#ca0b0b'
const CHART_NEUTRAL = '#b0aeab'

function fmt(v: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v)
}
function fmtShort(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v))
}
function txType(tx: Transaction): 'INCOME' | 'EXPENSE' {
  return String(tx.transaction_type ?? '').toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE'
}
function filterTxByCurrency(rows: Transaction[], currency: string): Transaction[] {
  const code = String(currency ?? '').toUpperCase()
  if (!code) return rows
  return rows.filter(tx => String(tx.currency ?? '').toUpperCase() === code)
}
function sumByType(txs: Transaction[], type: 'INCOME' | 'EXPENSE'): number {
  return txs.filter(t => txType(t) === type).reduce((s, t) => s + Number(t.amount), 0)
}
function deltaBadge(curr: number, prev: number, inverse = false): { text: string; tone: Tone } {
  if (prev === 0) return { text: curr === 0 ? '0%' : 'primer período', tone: 'flat' }
  const pct = ((curr - prev) / prev) * 100
  const isGood = inverse ? pct < 0 : pct > 0
  const tone: Tone = pct === 0 ? 'flat' : isGood ? 'positive' : 'negative'
  return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, tone }
}
function deltaPointsBadge(curr: number, prev: number, hasPrev: boolean): { text: string; tone: Tone } {
  if (!hasPrev) return { text: 'primer período', tone: 'flat' }
  const d = curr - prev
  return { text: `${d > 0 ? '+' : ''}${d.toFixed(1)} pp`, tone: d === 0 ? 'flat' : d > 0 ? 'positive' : 'negative' }
}
function toneFn(v: number): Tone {
  return v > 0 ? 'positive' : v < 0 ? 'negative' : 'flat'
}

// ─── Category helpers ─────────────────────────────────────────────────────────
const FIXED_KW = ['arriendo','alquiler','servicio','suscrip','internet','celular','seguro','educaci','colegio','universidad','hipoteca']
function classifyExpense(name: string): 'Gasto fijo' | 'Gasto variable' {
  const l = name.toLowerCase()
  return FIXED_KW.some(k => l.includes(k)) ? 'Gasto fijo' : 'Gasto variable'
}
function resolveCatName(rawId: number | null, lookup: Map<number, string>): string {
  if (rawId == null) return 'Sin categoría'
  return lookup.get(rawId) ?? 'Sin categoría'
}

function toneToVariant(tone: Tone, fallback: BadgeVariant = 'neutral'): BadgeVariant {
  if (tone === 'positive') return 'success'
  if (tone === 'negative') return 'brand'
  return fallback
}

// ─── Build aggregates ─────────────────────────────────────────────────────────
type MonthlyRow = { month: string; income: number; expense: number; cashflow: number; cumulative: number }
function buildMonthly(txs: Transaction[]): MonthlyRow[] {
  const map = new Map<string, { income: number; expense: number }>()
  for (const tx of txs) {
    const key = tx.occurred_at.slice(0, 7)
    if (!map.has(key)) map.set(key, { income: 0, expense: 0 })
    const r = map.get(key)!
    if (txType(tx) === 'INCOME') r.income += Number(tx.amount)
    else r.expense += Number(tx.amount)
  }
  const rows = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({
    month: fmtMonthLabel(k),
    income: v.income,
    expense: v.expense,
    cashflow: v.income - v.expense,
    cumulative: 0,
  }))
  let cum = 0
  for (const r of rows) { cum += r.cashflow; r.cumulative = cum }
  return rows
}
type CatRow = { name: string; value: number; bucket: string }
function buildCategoryRows(txs: Transaction[], lookup: Map<number, string>): CatRow[] {
  const map = new Map<string, number>()
  for (const tx of txs.filter(t => txType(t) === 'EXPENSE')) {
    const name = resolveCatName(tx.category_id, lookup)
    map.set(name, (map.get(name) ?? 0) + Number(tx.amount))
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({
    name, value, bucket: classifyExpense(name),
  }))
}
type StackedRow = { month: string; [cat: string]: number | string }
function buildStacked(txs: Transaction[], lookup: Map<number, string>): { rows: StackedRow[]; cats: string[] } {
  const expTxs = txs.filter(t => txType(t) === 'EXPENSE')
  const monthCatMap = new Map<string, Map<string, number>>()
  const catTotals = new Map<string, number>()
  for (const tx of expTxs) {
    const month = tx.occurred_at.slice(0, 7)
    const cat = resolveCatName(tx.category_id, lookup)
    if (!monthCatMap.has(month)) monthCatMap.set(month, new Map())
    const m = monthCatMap.get(month)!
    m.set(cat, (m.get(cat) ?? 0) + Number(tx.amount))
    catTotals.set(cat, (catTotals.get(cat) ?? 0) + Number(tx.amount))
  }
  const top5 = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n)
  const cats = [...top5, 'Otras']
  const rows: StackedRow[] = Array.from(monthCatMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([m, cmap]) => {
    const row: StackedRow = { month: fmtMonthLabel(m) }
    let otras = 0
    for (const [cat, v] of cmap.entries()) {
      if (top5.includes(cat)) row[cat] = (row[cat] as number ?? 0) + v
      else otras += v
    }
    if (otras > 0) row['Otras'] = otras
    return row
  })
  return { rows, cats }
}

// ─── Recharts tooltip style ────────────────────────────────────────────────────
const fmtTT = (v: unknown) => fmtShort(Number(v ?? 0))
const fmtTTPair = (v: unknown): [string, string] => [fmtShort(Number(v ?? 0)), '']
const CHART_TICK = 'var(--af-text-muted)'
const CHART_GRID = 'var(--af-border)'
const CHART_LEGEND = 'var(--af-text-muted)'
const TTStyle = { contentStyle: { background: 'var(--af-surface)', border: '1px solid var(--af-border)', borderRadius: '0.5rem', color: 'var(--af-text)', fontSize: 12, boxShadow: 'var(--af-shadow-md)' } }

// ─── Help descriptions ───────────────────────────────────────────────────────
const KPI_HELP: Record<string, string> = {
  'Patrimonio neto': 'Suma de los saldos actuales de todas tus cuentas en la moneda seleccionada. Refleja tu riqueza neta disponible en este momento.',
  'Ingresos': 'Total de entradas de dinero registradas en el período. Incluye salarios, transferencias recibidas y cualquier otro ingreso.',
  'Gastos': 'Total de egresos del período. Cuanto más bajo sea respecto a tus ingresos, mayor es tu capacidad de ahorro.',
  'Tasa de ahorro': 'Porcentaje de tus ingresos que no gastaste. ≥20% es saludable, 5–19% moderado, <5% requiere atención.',
}

const INSIGHT_HELP: Record<string, string> = {
  'Balance del período': 'Ingresos menos gastos del período seleccionado. Positivo significa que generaste excedente; negativo indica déficit.',
  'Movimientos': 'Número total de transacciones registradas en el período. Un volumen muy alto puede indicar atomización del gasto.',
  'Relación gastos/ingresos': 'Qué fracción de tus ingresos se va en gastos. ≤70% es saludable, 71–90% moderado, >90% indica que estás gastando casi todo lo que ganas.',
  'Mayor impacto': 'La categoría que concentró el mayor monto de gasto en el período. Útil para identificar dónde recortar.',
  'Mayor gasto individual': 'La transacción de egreso con el mayor importe registrado en el período.',
  'Cobertura de efectivo': 'Cuántos meses podrías sostenerte con tu patrimonio actual al ritmo de gasto mensual promedio del período. Se recomienda ≥6 meses.',
  'Mes más costoso': 'El mes que concentró el mayor nivel de gasto dentro del período seleccionado.',
  'Variación del gasto': 'Cambio porcentual del gasto total versus el período inmediatamente anterior de igual duración.',
  'Participación gasto fijo': 'Proporción del gasto total que corresponde a obligaciones recurrentes (arriendo, servicios, suscripciones, etc.). <35% flexible, 35–60% normal, >60% comprometido.',
}

const CHART_HELP: Record<string, string> = {
  'Ingresos vs gastos': 'Barras mensuales de ingresos y gastos lado a lado. Permite detectar rápidamente los meses en que los gastos superaron los ingresos.',
  'Flujo neto mensual': 'Diferencia mensual entre ingresos y gastos (ingresos − gastos). Valores positivos significan ahorro, negativos significan déficit en ese mes.',
  'Top categorías': 'Las 10 categorías de gasto más importantes del período, ordenadas de mayor a menor importe. Revela dónde se concentra tu gasto.',
  'Distribución de gasto': 'Vista proporcional (donut) de cuánto representa cada categoría sobre el gasto total. Ideal para ver la composición del gasto de un vistazo.',
  'Ahorro acumulado': 'Suma del flujo neto mes a mes a lo largo del período. Muestra si tu ahorro crece de forma sostenida o se erosiona en algún punto.',
  'Gasto fijo vs variable': 'Compara el total gastado en obligaciones fijas (arriendo, servicios, suscripciones) contra gastos discrecionales o variables.',
  'Gasto por categoría por mes': 'Barras apiladas que muestran cómo evoluciona el gasto de las 5 principales categorías mes a mes. Útil para detectar tendencias por rubro.',
}

// ─── Help tooltip ─────────────────────────────────────────────────────────────
function HelpTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center')
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const tooltipWidth = 224
    const margin = 8
    if (rect.left < tooltipWidth / 2 + margin) {
      setAlign('left')
      return
    }
    if (vw - rect.right < tooltipWidth / 2 + margin) {
      setAlign('right')
      return
    }
    setAlign('center')
  }, [open])

  const tooltipPosClass = align === 'left'
    ? 'left-0'
    : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2'
  const arrowPosClass = align === 'left'
    ? 'left-2'
    : align === 'right'
      ? 'right-2'
      : 'left-1/2 -translate-x-1/2'

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="w-4 h-4 rounded-full bg-transparent border border-neutral-900 text-neutral-900 text-[10px] flex items-center justify-center cursor-help select-none leading-none font-medium">
        ?
      </span>
      {open && (
        <span className={`absolute bottom-full mb-2 z-50 w-56 max-w-[calc(100vw-1rem)] bg-neutral-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl leading-relaxed pointer-events-none ${tooltipPosClass}`}>
          {text}
          <span className={`absolute top-full border-4 border-transparent border-t-neutral-900 ${arrowPosClass}`} />
        </span>
      )}
    </span>
  )
}

// ─── Small sub-components ─────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="app-section-title mb-3">{children}</h2>
}

type BadgeVariant = 'brand' | 'success' | 'warning' | 'neutral'
interface BadgeProps { text: string; variant: BadgeVariant; hint?: string }
function Badge({ text, variant, hint }: BadgeProps) {
  const [open, setOpen] = useState(false)
  const [align, setAlign] = useState<'left' | 'right'>('right')
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const tooltipWidth = 208
    const margin = 8
    if (rect.left < tooltipWidth - rect.width + margin) {
      setAlign('left')
      return
    }
    setAlign('right')
  }, [open])

  const cls = {
    brand: 'bg-[#fce8e8] text-[#8a0808]',
    success: 'bg-[#e6f4ef] text-[#0f5c40]',
    warning: 'bg-[#fff4e0] text-[#8a5200]',
    neutral: 'bg-[#edeceb] text-[#4a4845]',
  }[variant]
  return (
    <span ref={ref} className="relative inline-flex"
      onMouseEnter={() => hint && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cls} ${hint ? 'cursor-help' : ''}`}>{text}</span>
      {open && hint && (
        <span className={`absolute bottom-full mb-2 z-50 w-52 max-w-[calc(100vw-1rem)] bg-neutral-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl leading-relaxed pointer-events-none whitespace-normal ${align === 'left' ? 'left-0' : 'right-0'}`}>
          {hint}
          <span className={`absolute top-full border-4 border-transparent border-t-neutral-900 ${align === 'left' ? 'left-3' : 'right-3'}`} />
        </span>
      )}
    </span>
  )
}

interface KpiCardProps { label: string; value: string; sub?: string; badge?: BadgeProps; accentClass?: string; accentRingClass?: string; valueClass?: string; help?: string }
function KpiCard({ label, value, sub, badge, accentClass = 'bg-neutral-100', accentRingClass = 'ring-1 ring-neutral-100', valueClass = 'text-[var(--af-text)]', help }: KpiCardProps) {
  return (
    <div className={`app-card p-5 relative ${accentRingClass}`}>
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${accentClass}`} />
      {help && <span className="absolute top-3 right-3"><HelpTooltip text={help} /></span>}
      <div className="flex items-center gap-1.5 mb-1">
        <p className="app-label uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-medium leading-none ${valueClass}`}>{value}</p>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {sub && <p className="app-subtitle text-xs leading-snug">{sub}</p>}
        {badge && <Badge {...badge} />}
      </div>
    </div>
  )
}

interface InsightCardProps { label: string; value: string; sub?: string; tone?: Tone; help?: string }
function InsightCard({ label, value, sub, tone = 'neutral', help }: InsightCardProps) {
  const valCls = { positive: 'text-[#0f7a55]', negative: 'text-[#c47a00]', flat: 'text-[#4a4845]', neutral: 'text-[#1c1b1a]' }[tone]
  const accentCls = {
    positive: 'border-l-4 border-l-success ring-1 ring-success/20',
    negative: 'border-l-4 border-l-warning ring-1 ring-warning/20',
    flat: 'border-l-4 border-l-neutral-400 ring-1 ring-neutral-100',
    neutral: 'border-l-4 border-l-neutral-400 ring-1 ring-neutral-100',
  }[tone]
  return (
    <div className={`bg-white border border-[#edeceb] rounded-xl p-4 shadow-sm relative transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md ${accentCls}`}>
      {help && <span className="absolute top-3 right-3"><HelpTooltip text={help} /></span>}
      <div className="flex items-center gap-1.5 mb-1">
        <p className="app-label uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-medium leading-none truncate ${valCls}`}>{value}</p>
      {sub && <p className="app-subtitle text-xs mt-1.5 leading-snug">{sub}</p>}
    </div>
  )
}

// ─── Chart type selector button group ────────────────────────────────────────
const CHART_OPTIONS = [
  'Ingresos vs gastos',
  'Flujo neto mensual',
  'Top categorías',
  'Distribución de gasto',
  'Ahorro acumulado',
  'Gasto fijo vs variable',
  'Gasto por categoría por mes',
] as const
type ChartType = typeof CHART_OPTIONS[number]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const today = new Date()
  const todayStr = toISODate(today)
  const yearStart = `${today.getFullYear()}-01-01`

  const [period, setPeriod] = useState<Period>('Año actual')
  const [currency, setCurrency] = useState('COP')
  const [customFrom, setCustomFrom] = useState(yearStart)
  const [customTo, setCustomTo] = useState(todayStr)
  const [dataBounds, setDataBounds] = useState({ min: yearStart, max: todayStr })
  const [chartType, setChartType] = useState<ChartType>('Ingresos vs gastos')

  const [accounts, setAccounts] = useState<Account[]>([])
  const [txs, setTxs] = useState<Transaction[]>([])
  const [prevTxs, setPrevTxs] = useState<Transaction[]>([])
  const [catLookup, setCatLookup] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Compute date ranges
  const { dateFrom, dateTo } = useMemo(() => computeDates(period, customFrom, customTo), [period, customFrom, customTo])
  const { prevFrom, prevTo } = useMemo(() => computePrevDates(period, dateFrom, dateTo), [period, dateFrom, dateTo])

  // Fetch allowed custom-date bounds from real data for selected currency
  useEffect(() => {
    transactionsApi.list()
      .then(resp => {
        const rows = resp.data.filter(tx => String(tx.currency ?? '').toUpperCase() === currency)
        if (rows.length === 0) {
          setDataBounds({ min: yearStart, max: todayStr })
          return
        }

        const dates = rows
          .map(tx => tx.occurred_at.slice(0, 10))
          .sort((a, b) => a.localeCompare(b))

        setDataBounds({ min: dates[0], max: dates[dates.length - 1] })
      })
      .catch(() => {
        setDataBounds({ min: yearStart, max: todayStr })
      })
  }, [currency, yearStart, todayStr])

  // Clamp custom period to valid bounds and preserve from <= to
  useEffect(() => {
    const clampedFrom = clampISO(customFrom, dataBounds.min, dataBounds.max)
    const clampedTo = clampISO(customTo, dataBounds.min, dataBounds.max)

    if (clampedFrom > clampedTo) {
      setCustomFrom(dataBounds.min)
      setCustomTo(dataBounds.max)
      return
    }

    if (clampedFrom !== customFrom) setCustomFrom(clampedFrom)
    if (clampedTo !== customTo) setCustomTo(clampedTo)
  }, [customFrom, customTo, dataBounds])

  // Fetch data
  useEffect(() => {
    setLoading(true)
    setError(null)
    const dfStr = toISODate(dateFrom) + 'T00:00:00'
    const dtStr = toISODate(dateTo) + 'T23:59:59'
    const pfStr = toISODate(prevFrom) + 'T00:00:00'
    const ptStr = toISODate(prevTo) + 'T23:59:59'
    Promise.all([
      metricsApi.dashboard(currency),
      accountsApi.list(),
      transactionsApi.list({ start_date: dfStr, end_date: dtStr, currency }),
      transactionsApi.list({ start_date: pfStr, end_date: ptStr, currency }),
      categoriesApi.list(),
    ])
      .then(([, a, t, pt, c]) => {
        const currentTxs = filterTxByCurrency(t.data, currency)
        const previousTxs = filterTxByCurrency(pt.data, currency)
        setAccounts(a.data)
        setTxs(currentTxs)
        setPrevTxs(previousTxs)
        const lookup = new Map<number, string>(c.data.map((cat: Category) => [cat.id, cat.name]))
        setCatLookup(lookup)
      })
      .catch(() => setError('No se pudieron cargar los datos del dashboard.'))
      .finally(() => setLoading(false))
  }, [currency, dateFrom.getTime(), dateTo.getTime()])

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const netWorth = useMemo(
    () => accounts.filter(a => a.currency.toUpperCase() === currency).reduce((s, a) => s + Number(a.current_balance ?? a.balance ?? 0), 0),
    [accounts, currency],
  )
  const income = useMemo(() => sumByType(txs, 'INCOME'), [txs])
  const expense = useMemo(() => sumByType(txs, 'EXPENSE'), [txs])
  const cashflow = income - expense
  const savingsRate = income > 0 ? (cashflow / income) * 100 : 0
  const prevIncome = useMemo(() => sumByType(prevTxs, 'INCOME'), [prevTxs])
  const prevExpense = useMemo(() => sumByType(prevTxs, 'EXPENSE'), [prevTxs])
  const prevCashflow = prevIncome - prevExpense
  const prevSavings = prevIncome > 0 ? (prevCashflow / prevIncome) * 100 : 0
  const hasPrev = prevTxs.length > 0

  const monthly = useMemo(() => buildMonthly(txs), [txs])
  const catRows = useMemo(() => buildCategoryRows(txs, catLookup), [txs, catLookup])
  const expTxs = useMemo(() => txs.filter(t => txType(t) === 'EXPENSE'), [txs])
  const { rows: stackedRows, cats: stackedCats } = useMemo(() => buildStacked(txs, catLookup), [txs, catLookup])

  // Insight calcs
  const balance = income - expense
  const expRatio = income > 0 ? (expense / income) * 100 : null
  const avgMonthlyExp = monthly.length > 0 ? monthly.reduce((s, r) => s + r.expense, 0) / monthly.length : 0
  const cashCoverage = avgMonthlyExp > 0 && netWorth > 0 ? netWorth / avgMonthlyExp : null
  const topCat = catRows[0] ?? null
  const topCatShare = topCat && expense > 0 ? (topCat.value / expense) * 100 : 0
  const biggestTx = expTxs.length > 0 ? expTxs.reduce((a, b) => Number(a.amount) > Number(b.amount) ? a : b) : null
  const highestMonth = monthly.length > 0 ? monthly.reduce((a, b) => a.expense > b.expense ? a : b) : null
  const expVariation = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : null
  const fixedTotal = expTxs.reduce((s, tx) => {
    const name = resolveCatName(tx.category_id, catLookup)
    return s + (classifyExpense(name) === 'Gasto fijo' ? Number(tx.amount) : 0)
  }, 0)
  const fixedShare = expense > 0 ? (fixedTotal / expense) * 100 : null

  // Fixed vs variable data for chart
  const fixedVarData = [
    { name: 'Gasto fijo', value: fixedTotal },
    { name: 'Gasto variable', value: expense - fixedTotal },
  ]

  // Badges
  const incomeBadge = deltaBadge(income, prevIncome)
  const expenseBadge = deltaBadge(expense, prevExpense, true)
  const cashflowBadge = deltaBadge(cashflow, prevCashflow)
  const savingsBadge = deltaPointsBadge(savingsRate, prevSavings, hasPrev)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[var(--af-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return <div className="alert-error max-w-md mx-auto mt-8">{error}</div>

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] rounded-2xl p-4 md:p-6">

      {/* Header */}
      <div>
        <h1 className="app-title text-xl">Resumen financiero</h1>
        <p className="app-subtitle text-sm mt-0.5">Vista general de tus finanzas en el período elegido</p>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-50 relative -mx-4 md:-mx-6 px-4 md:px-6 pt-1 pb-0 bg-neutral-50">
        <div className="absolute -top-8 left-0 right-0 h-8 bg-neutral-50 pointer-events-none" />
        <div className="overflow-visible bg-white border border-neutral-100 border-t-4 border-t-brand border-b-neutral-400/40 ring-2 ring-brand/20 rounded-2xl flex flex-wrap items-end gap-4 px-5 py-4 shadow-xl">
          <div className="flex flex-col gap-1">
            <label className="app-label">Período</label>
            <Select value={period} onChange={v => setPeriod(v as Period)}
              options={['Año actual','Últimos 90 días','Últimos 30 días','Personalizado'].map(v => ({ value: v, label: v }))}
              className="w-44" />
          </div>
          <DatePicker
            label="Desde"
            value={period === 'Personalizado' ? customFrom : toISODate(dateFrom)}
            onChange={setCustomFrom}
            min={dataBounds.min}
            max={customTo < dataBounds.max ? customTo : dataBounds.max}
            disabled={period !== 'Personalizado'}
          />
          <DatePicker
            label="Hasta"
            value={period === 'Personalizado' ? customTo : toISODate(dateTo)}
            onChange={setCustomTo}
            min={customFrom > dataBounds.min ? customFrom : dataBounds.min}
            max={dataBounds.max}
            disabled={period !== 'Personalizado'}
          />
          <div className="flex flex-col gap-1 ml-auto">
            <label className="app-label">Moneda</label>
            <Select value={currency} onChange={setCurrency}
              options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }]}
              className="w-24" />
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <section>
        <SectionTitle>Indicadores clave</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Patrimonio neto" value={fmt(netWorth, currency)} accentClass="bg-[#ca0b0b]" accentRingClass="ring-2 ring-brand/20" valueClass="text-[#ca0b0b]" sub="saldo actual" badge={{ text: cashflowBadge.text, variant: toneToVariant(cashflowBadge.tone, 'brand'), hint: hasPrev ? `El flujo neto del período anterior fue ${fmt(prevCashflow, currency)}. Un flujo positivo mejora tu patrimonio acumulado.` : 'No hay período anterior para comparar.' }} help={KPI_HELP['Patrimonio neto']} />
          <KpiCard label="Ingresos" value={fmt(income, currency)} accentClass="bg-[#0f7a55]" accentRingClass="ring-2 ring-success/20" valueClass="text-[#0f7a55]" sub="total del período" badge={{ text: incomeBadge.text, variant: toneToVariant(incomeBadge.tone, 'success'), hint: hasPrev ? `En el período anterior tus ingresos fueron ${fmt(prevIncome, currency)}. ${incomeBadge.tone === 'positive' ? 'Generaste más ingresos, buen ritmo.' : incomeBadge.tone === 'negative' ? 'Tus ingresos cayeron respecto al período previo.' : 'Ingresos estables.'}` : 'No hay período anterior para comparar.' }} help={KPI_HELP['Ingresos']} />
          <KpiCard label="Gastos" value={fmt(expense, currency)} accentClass="bg-[#c47a00]" accentRingClass="ring-2 ring-warning/20" valueClass="text-[#c47a00]" sub="total del período" badge={{ text: expenseBadge.text, variant: toneToVariant(expenseBadge.tone, 'warning'), hint: hasPrev ? `En el período anterior tus gastos fueron ${fmt(prevExpense, currency)}. ${expenseBadge.tone === 'positive' ? 'Gastaste menos que antes, bien.' : expenseBadge.tone === 'negative' ? 'Tus gastos aumentaron respecto al período previo.' : 'Gasto estable.'}` : 'No hay período anterior para comparar.' }} help={KPI_HELP['Gastos']} />
          <KpiCard
            label="Tasa de ahorro"
            value={income === 0 ? 'Sin datos' : `${Math.abs(savingsRate) >= 999 ? (savingsRate > 0 ? '>999' : '<-999') : savingsRate.toFixed(1)}%`}
            sub={income > 0 ? (savingsRate >= 20 ? 'margen saludable' : savingsRate >= 5 ? 'margen moderado' : 'margen bajo') : 'sin ingresos'}
            accentClass="bg-[#5f0404]"
            accentRingClass="ring-2 ring-brand-deep/20"
            valueClass="text-[#5f0404]"
            badge={{ text: savingsBadge.text, variant: toneToVariant(savingsBadge.tone, 'brand'), hint: hasPrev ? `Tu tasa de ahorro en el período anterior fue ${prevSavings.toFixed(1)}%. ${savingsBadge.tone === 'positive' ? 'Estás ahorrando una mayor proporción de tus ingresos.' : savingsBadge.tone === 'negative' ? 'Tu tasa de ahorro bajó respecto al período previo.' : 'Tasa de ahorro estable.'}` : 'No hay período anterior para comparar.' }}
            help={KPI_HELP['Tasa de ahorro']}
          />
        </div>
      </section>

      {/* Insight cards */}
      <section className="pt-1">
        <SectionTitle>Análisis del período</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InsightCard label="Balance del período" value={fmt(balance, currency)} sub={balance > 0 ? 'Saldo positivo ✓' : balance < 0 ? 'Gastos superan ingresos' : 'Equilibrado'} tone={toneFn(balance)} help={INSIGHT_HELP['Balance del período']} />
          <InsightCard label="Movimientos" value={`${txs.length.toLocaleString('es-CO')}`} sub="Transacciones en el período" tone="neutral" help={INSIGHT_HELP['Movimientos']} />
          <InsightCard
            label="Relación gastos/ingresos"
            value={expRatio != null ? `${expRatio.toFixed(1)}%` : 'Sin datos'}
            sub={expRatio != null ? `${expRatio <= 70 ? 'saludable' : expRatio <= 90 ? 'moderado' : 'alto'} · ${fmt(expense, currency)} de ${fmt(income, currency)}` : 'No hay ingresos'}
            tone={expRatio == null ? 'neutral' : expRatio <= 70 ? 'positive' : expRatio <= 90 ? 'flat' : 'negative'}
            help={INSIGHT_HELP['Relación gastos/ingresos']}
          />
          <InsightCard label="Mayor impacto" value={topCat?.name ?? 'Sin gastos'} sub={topCat ? `${topCatShare.toFixed(1)}% del gasto · ${fmt(topCat.value, currency)}` : 'No hay egresos suficientes'} tone="neutral" help={INSIGHT_HELP['Mayor impacto']} />
          <InsightCard label="Mayor gasto individual" value={biggestTx ? fmt(Number(biggestTx.amount), currency) : 'Sin gastos'} sub={biggestTx?.description ?? 'No hay egresos registrados'} tone="negative" help={INSIGHT_HELP['Mayor gasto individual']} />
          <InsightCard
            label="Cobertura de efectivo"
            value={cashCoverage != null ? `${cashCoverage.toFixed(1)} meses` : netWorth <= 0 ? fmt(netWorth, currency) : 'Sin referencia'}
            sub={cashCoverage != null ? `Al ritmo de ${fmt(avgMonthlyExp, currency)}/mes` : 'Necesitas gasto mensual para estimar'}
            tone={cashCoverage == null ? 'neutral' : cashCoverage >= 6 ? 'positive' : cashCoverage < 1 ? 'negative' : 'flat'}
            help={INSIGHT_HELP['Cobertura de efectivo']}
          />
          <InsightCard label="Mes más costoso" value={highestMonth?.month ?? 'Sin gastos'} sub={highestMonth ? `Gasto: ${fmt(highestMonth.expense, currency)}` : 'No hay meses con gasto'} tone="neutral" help={INSIGHT_HELP['Mes más costoso']} />
          <InsightCard
            label="Variación del gasto"
            value={expVariation != null ? `${expVariation > 0 ? '+' : ''}${expVariation.toFixed(1)}%` : 'Sin referencia'}
            sub={expVariation != null ? `Anterior: ${fmt(prevExpense, currency)} · Actual: ${fmt(expense, currency)}` : 'No hay período anterior'}
            tone={expVariation == null ? 'neutral' : expVariation > 0 ? 'negative' : expVariation < 0 ? 'positive' : 'flat'}
            help={INSIGHT_HELP['Variación del gasto']}
          />
          <InsightCard
            label="Participación gasto fijo"
            value={fixedShare != null ? `${fixedShare.toFixed(1)}%` : 'Sin gastos'}
            sub={fixedShare != null ? `Fijo: ${fmt(fixedTotal, currency)} · Variable: ${fmt(expense - fixedTotal, currency)}` : 'No hay egresos'}
            tone={fixedShare == null ? 'neutral' : fixedShare >= 60 ? 'negative' : fixedShare <= 35 ? 'positive' : 'flat'}
            help={INSIGHT_HELP['Participación gasto fijo']}
          />
        </div>
      </section>

      {/* Analysis section */}
      <section className="pt-1">
        <SectionTitle>Análisis gráfico</SectionTitle>
        <div className="app-panel p-5 space-y-5">
          {/* Chart type selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Select
                value={chartType}
                onChange={v => setChartType(v as ChartType)}
                options={CHART_OPTIONS.map(opt => ({ value: opt, label: opt }))}
                className="w-72"
              />
            </div>
            <p className="text-neutral-700 text-sm leading-relaxed w-full">{CHART_HELP[chartType]}</p>
          </div>

          {/* Charts */}
          {chartType === 'Ingresos vs gastos' && (
            monthly.length > 0
              ? <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthly} barGap={4} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="month" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} cursor={false} />
                    <Legend wrapperStyle={{ fontSize: 12, color: CHART_LEGEND }} />
                    <Bar dataKey="income" name="Ingresos" fill={CHART_INCOME} radius={[4,4,0,0]} />
                    <Bar dataKey="expense" name="Gastos" fill={CHART_EXPENSE} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">Sin datos para el período.</p>
          )}

          {chartType === 'Flujo neto mensual' && (
            monthly.length > 0
              ? <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_SAVINGS} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={CHART_SAVINGS} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_EXPENSE} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={CHART_EXPENSE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="month" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} cursor={false} />
                    <Area type="monotone" dataKey="cashflow" name="Flujo neto" stroke={CHART_NEUTRAL} fill="url(#posGrad)" strokeWidth={2.5} dot={{ r: 3, fill: CHART_NEUTRAL }} />
                  </AreaChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">Sin datos para el período.</p>
          )}

          {chartType === 'Top categorías' && (
            catRows.length > 0
              ? <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[...catRows].reverse()} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtShort} tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip {...TTStyle} formatter={fmtTT} cursor={false} />
                    <Bar dataKey="value" name="Gasto" radius={[0,4,4,0]}>
                      {[...catRows].reverse().map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">Sin gastos registrados en el período.</p>
          )}

          {chartType === 'Distribución de gasto' && (
            catRows.length > 0
              ? <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={catRows} cx="50%" cy="50%" innerRadius={75} outerRadius={105} dataKey="value" paddingAngle={2} label={false}>
                      {catRows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip {...TTStyle} formatter={fmtTTPair} cursor={false} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11, color: CHART_LEGEND }} formatter={(v: string) => v.length > 14 ? v.slice(0,14)+'…' : v} />
                  </PieChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">Sin gastos registrados en el período.</p>
          )}

          {chartType === 'Ahorro acumulado' && (
            monthly.length > 0
              ? <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthly}>
                    <defs>
                      <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_SAVINGS} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={CHART_SAVINGS} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="month" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} cursor={false} />
                    <Line type="monotone" dataKey="cumulative" name="Ahorro acumulado" stroke={CHART_SAVINGS} strokeWidth={2.5} dot={{ r: 3, fill: CHART_SAVINGS }} />
                  </LineChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">Sin datos para el período.</p>
          )}

          {chartType === 'Gasto fijo vs variable' && (
            expense > 0
              ? <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={fixedVarData} barCategoryGap="40%">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="name" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} cursor={false} />
                    <Bar dataKey="value" name="Gasto" radius={[4,4,0,0]}>
                      <Cell fill={CHART_EXPENSE} />
                      <Cell fill={CHART_NEUTRAL} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">Sin gastos registrados en el período.</p>
          )}

          {chartType === 'Gasto por categoría por mes' && (
            stackedRows.length > 0
              ? <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stackedRows} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="month" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} cursor={false} />
                    <Legend wrapperStyle={{ fontSize: 11, color: CHART_LEGEND }} />
                    {stackedCats.map((cat, i) => (
                      <Bar key={cat} dataKey={cat} stackId="a" fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">Sin gastos registrados en el período.</p>
          )}
        </div>
      </section>

      {txs.length === 0 && (
        <div className="app-card p-10 text-center app-subtitle">
          <p className="text-lg mb-1">Sin transacciones en este período</p>
          <p className="text-sm">Ajusta el filtro de fechas o importa movimientos.</p>
        </div>
      )}
    </div>
  )
}
