import { useEffect, useMemo, useState } from 'react'
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
import type { Transaction, Account } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = 'Año actual' | 'Últimos 90 días' | 'Últimos 30 días' | 'Personalizado'
type Tone = 'positive' | 'negative' | 'flat' | 'neutral'

// ─── Date helpers ─────────────────────────────────────────────────────────────
const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
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
const PALETTE = ['#6366f1','#8b5cf6','#10b981','#f43f5e','#f59e0b','#06b6d4','#ec4899','#84cc16']

function fmt(v: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v)
}
function fmtShort(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v))
}
function sumByType(txs: Transaction[], type: 'INCOME' | 'EXPENSE'): number {
  return txs.filter(t => t.transaction_type === type).reduce((s, t) => s + Number(t.amount), 0)
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

// ─── Build aggregates ─────────────────────────────────────────────────────────
type MonthlyRow = { month: string; income: number; expense: number; cashflow: number; cumulative: number }
function buildMonthly(txs: Transaction[]): MonthlyRow[] {
  const map = new Map<string, { income: number; expense: number }>()
  for (const tx of txs) {
    const key = tx.occurred_at.slice(0, 7)
    if (!map.has(key)) map.set(key, { income: 0, expense: 0 })
    const r = map.get(key)!
    if (tx.transaction_type === 'INCOME') r.income += Number(tx.amount)
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
  for (const tx of txs.filter(t => t.transaction_type === 'EXPENSE')) {
    const name = resolveCatName(tx.category_id, lookup)
    map.set(name, (map.get(name) ?? 0) + Number(tx.amount))
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({
    name, value, bucket: classifyExpense(name),
  }))
}
type StackedRow = { month: string; [cat: string]: number | string }
function buildStacked(txs: Transaction[], lookup: Map<number, string>): { rows: StackedRow[]; cats: string[] } {
  const expTxs = txs.filter(t => t.transaction_type === 'EXPENSE')
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
const TTStyle = { contentStyle: { background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', color: '#e2e8f0', fontSize: 12 } }

// ─── Small sub-components ─────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{children}</h2>
}

interface BadgeProps { text: string; tone: Tone }
function Badge({ text, tone }: BadgeProps) {
  const cls = { positive: 'bg-emerald-500/15 text-emerald-400', negative: 'bg-rose-500/15 text-rose-400', flat: 'bg-white/10 text-slate-400', neutral: 'bg-white/10 text-slate-400' }[tone]
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>{text}</span>
}

interface KpiCardProps { label: string; value: string; sub?: string; badge?: BadgeProps; accentClass?: string }
function KpiCard({ label, value, sub, badge, accentClass = 'border-l-white/10' }: KpiCardProps) {
  return (
    <div className={`card-glass p-5 border-l-4 ${accentClass}`}>
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
        {badge && <Badge {...badge} />}
      </div>
    </div>
  )
}

interface InsightCardProps { label: string; value: string; sub?: string; tone?: Tone }
function InsightCard({ label, value, sub, tone = 'neutral' }: InsightCardProps) {
  const valCls = { positive: 'text-emerald-400', negative: 'text-rose-400', flat: 'text-slate-300', neutral: 'text-slate-200' }[tone]
  return (
    <div className="card-glass p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold leading-none truncate ${valCls}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1 leading-snug">{sub}</p>}
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

// ─── Date picker input ────────────────────────────────────────────────────────
function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400">{label}</label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        className="input-dark w-36 text-xs px-2 py-1.5" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const today = new Date()
  const todayStr = toISODate(today)
  const yearStart = `${today.getFullYear()}-01-01`

  const [period, setPeriod] = useState<Period>('Año actual')
  const [currency, setCurrency] = useState('COP')
  const [customFrom, setCustomFrom] = useState(yearStart)
  const [customTo, setCustomTo] = useState(todayStr)
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
        setAccounts(a.data)
        setTxs(t.data)
        setPrevTxs(pt.data)
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
  const expTxs = useMemo(() => txs.filter(t => t.transaction_type === 'EXPENSE'), [txs])
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

  const recentTxs = useMemo(
    () => [...txs].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()).slice(0, 8),
    [txs],
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return <div className="alert-error max-w-md mx-auto mt-8">{error}</div>

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header + filters */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Panorama financiero</h1>
          <p className="text-sm text-slate-400 mt-0.5">Vista general de tus finanzas en el período elegido</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Período</label>
            <Select value={period} onChange={v => setPeriod(v as Period)}
              options={['Año actual','Últimos 90 días','Últimos 30 días','Personalizado'].map(v => ({ value: v, label: v }))}
              className="w-44" />
          </div>
          {period === 'Personalizado' && (
            <>
              <DateInput label="Desde" value={customFrom} onChange={setCustomFrom} />
              <DateInput label="Hasta" value={customTo} onChange={setCustomTo} />
            </>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Moneda</label>
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
          <KpiCard label="Patrimonio neto" value={fmt(netWorth, currency)} accentClass={toneFn(netWorth) === 'positive' ? 'border-l-indigo-500' : 'border-l-rose-500'} sub="saldo actual" badge={cashflowBadge} />
          <KpiCard label="Ingresos" value={fmt(income, currency)} accentClass="border-l-emerald-500" sub="total del período" badge={incomeBadge} />
          <KpiCard label="Gastos" value={fmt(expense, currency)} accentClass="border-l-rose-500" sub="total del período" badge={expenseBadge} />
          <KpiCard
            label="Tasa de ahorro"
            value={income === 0 ? 'Sin datos' : `${Math.abs(savingsRate) >= 999 ? (savingsRate > 0 ? '>999' : '<-999') : savingsRate.toFixed(1)}%`}
            sub={income > 0 ? (savingsRate >= 20 ? 'margen saludable' : savingsRate >= 5 ? 'margen moderado' : 'margen bajo') : 'sin ingresos'}
            accentClass={savingsRate > 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}
            badge={savingsBadge}
          />
        </div>
      </section>

      {/* Insight cards */}
      <section>
        <SectionTitle>Análisis del período</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InsightCard label="Balance del período" value={fmt(balance, currency)} sub={balance > 0 ? 'Saldo positivo ✓' : balance < 0 ? 'Gastos superan ingresos' : 'Equilibrado'} tone={toneFn(balance)} />
          <InsightCard label="Movimientos" value={`${txs.length.toLocaleString('es-CO')}`} sub="Transacciones en el período" tone="neutral" />
          <InsightCard
            label="Relación gastos/ingresos"
            value={expRatio != null ? `${expRatio.toFixed(1)}%` : 'Sin datos'}
            sub={expRatio != null ? `${expRatio <= 70 ? 'saludable' : expRatio <= 90 ? 'moderado' : 'alto'} · ${fmt(expense, currency)} de ${fmt(income, currency)}` : 'No hay ingresos'}
            tone={expRatio == null ? 'neutral' : expRatio <= 70 ? 'positive' : expRatio <= 90 ? 'flat' : 'negative'}
          />
          <InsightCard label="Mayor impacto" value={topCat?.name ?? 'Sin gastos'} sub={topCat ? `${topCatShare.toFixed(1)}% del gasto · ${fmt(topCat.value, currency)}` : 'No hay egresos suficientes'} tone="neutral" />
          <InsightCard label="Mayor gasto individual" value={biggestTx ? fmt(Number(biggestTx.amount), currency) : 'Sin gastos'} sub={biggestTx?.description ?? 'No hay egresos registrados'} tone="negative" />
          <InsightCard
            label="Cobertura de efectivo"
            value={cashCoverage != null ? `${cashCoverage.toFixed(1)} meses` : netWorth <= 0 ? fmt(netWorth, currency) : 'Sin referencia'}
            sub={cashCoverage != null ? `Al ritmo de ${fmt(avgMonthlyExp, currency)}/mes` : 'Necesitas gasto mensual para estimar'}
            tone={cashCoverage == null ? 'neutral' : cashCoverage >= 6 ? 'positive' : cashCoverage < 1 ? 'negative' : 'flat'}
          />
          <InsightCard label="Mes más costoso" value={highestMonth?.month ?? 'Sin gastos'} sub={highestMonth ? `Gasto: ${fmt(highestMonth.expense, currency)}` : 'No hay meses con gasto'} tone="neutral" />
          <InsightCard
            label="Variación del gasto"
            value={expVariation != null ? `${expVariation > 0 ? '+' : ''}${expVariation.toFixed(1)}%` : 'Sin referencia'}
            sub={expVariation != null ? `Anterior: ${fmt(prevExpense, currency)} · Actual: ${fmt(expense, currency)}` : 'No hay período anterior'}
            tone={expVariation == null ? 'neutral' : expVariation > 0 ? 'negative' : expVariation < 0 ? 'positive' : 'flat'}
          />
          <InsightCard
            label="Participación gasto fijo"
            value={fixedShare != null ? `${fixedShare.toFixed(1)}%` : 'Sin gastos'}
            sub={fixedShare != null ? `Fijo: ${fmt(fixedTotal, currency)} · Variable: ${fmt(expense - fixedTotal, currency)}` : 'No hay egresos'}
            tone={fixedShare == null ? 'neutral' : fixedShare >= 60 ? 'negative' : fixedShare <= 35 ? 'positive' : 'flat'}
          />
        </div>
      </section>

      {/* Analysis section */}
      <section>
        <SectionTitle>Análisis gráfico</SectionTitle>
        <div className="card-glass p-5 space-y-5">
          {/* Chart type tabs */}
          <div className="flex flex-wrap gap-2">
            {CHART_OPTIONS.map(opt => (
              <button key={opt} type="button" onClick={() => setChartType(opt)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${chartType === opt ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}>
                {opt}
              </button>
            ))}
          </div>

          {/* Charts */}
          {chartType === 'Ingresos vs gastos' && (
            monthly.length > 0
              ? <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthly} barGap={4} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                    <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="expense" name="Gastos" fill="#f43f5e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              : <p className="text-slate-500 text-sm">Sin datos para el período.</p>
          )}

          {chartType === 'Flujo neto mensual' && (
            monthly.length > 0
              ? <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} />
                    <Area type="monotone" dataKey="cashflow" name="Flujo neto" stroke="#6366f1" fill="url(#posGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
                  </AreaChart>
                </ResponsiveContainer>
              : <p className="text-slate-500 text-sm">Sin datos para el período.</p>
          )}

          {chartType === 'Top categorías' && (
            catRows.length > 0
              ? <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[...catRows].reverse()} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtShort} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip {...TTStyle} formatter={fmtTT} />
                    <Bar dataKey="value" name="Gasto" radius={[0,4,4,0]}>
                      {[...catRows].reverse().map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              : <p className="text-slate-500 text-sm">Sin gastos registrados en el período.</p>
          )}

          {chartType === 'Distribución de gasto' && (
            catRows.length > 0
              ? <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={catRows} cx="50%" cy="50%" innerRadius={75} outerRadius={105} dataKey="value" paddingAngle={2} label={false}>
                      {catRows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip {...TTStyle} formatter={fmtTTPair} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} formatter={(v: string) => v.length > 14 ? v.slice(0,14)+'…' : v} />
                  </PieChart>
                </ResponsiveContainer>
              : <p className="text-slate-500 text-sm">Sin gastos registrados en el período.</p>
          )}

          {chartType === 'Ahorro acumulado' && (
            monthly.length > 0
              ? <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthly}>
                    <defs>
                      <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} />
                    <Line type="monotone" dataKey="cumulative" name="Ahorro acumulado" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              : <p className="text-slate-500 text-sm">Sin datos para el período.</p>
          )}

          {chartType === 'Gasto fijo vs variable' && (
            expense > 0
              ? <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={fixedVarData} barCategoryGap="40%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} />
                    <Bar dataKey="value" name="Gasto" radius={[4,4,0,0]}>
                      <Cell fill="#f59e0b" />
                      <Cell fill="#6366f1" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              : <p className="text-slate-500 text-sm">Sin gastos registrados en el período.</p>
          )}

          {chartType === 'Gasto por categoría por mes' && (
            stackedRows.length > 0
              ? <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stackedRows} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    {stackedCats.map((cat, i) => (
                      <Bar key={cat} dataKey={cat} stackId="a" fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              : <p className="text-slate-500 text-sm">Sin gastos registrados en el período.</p>
          )}
        </div>
      </section>

      {/* Recent transactions */}
      {recentTxs.length > 0 && (
        <section>
          <SectionTitle>Últimos movimientos</SectionTitle>
          <div className="card-glass overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Descripción</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Fecha</th>
                  <th className="text-right px-4 py-3">Monto</th>
                </tr>
              </thead>
              <tbody>
                {recentTxs.map(tx => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-slate-200 truncate max-w-xs">{tx.description}</td>
                    <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                      {new Date(tx.occurred_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${tx.transaction_type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.transaction_type === 'INCOME' ? '+' : '-'}{fmtShort(Number(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {txs.length === 0 && (
        <div className="card-glass p-10 text-center text-slate-400">
          <p className="text-lg mb-1">Sin transacciones en este período</p>
          <p className="text-sm">Ajusta el filtro de fechas o importa movimientos.</p>
        </div>
      )}
    </div>
  )
}
