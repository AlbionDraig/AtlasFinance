import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { metricsApi } from '@/api/metrics'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import FilterCard from '@/components/ui/FilterCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AppTooltip from '@/components/ui/Tooltip'
import { useToast } from '@/hooks/useToast'
import type { DashboardAggregates, DashboardMetrics } from '@/types'
import {
  type Period, type Tone, type BadgeVariant,
  PALETTE, CHART_INCOME, CHART_EXPENSE, CHART_SAVINGS, CHART_NEUTRAL,
  CHART_TICK, CHART_GRID, CHART_LEGEND, TTStyle,
  toISODate, clampISO, fmtMonthLabel, computeDates, computePrevDates,
  fmt, fmtShort, fmtTT, fmtTTPair,
  deltaBadge, deltaPointsBadge, toneFn, toneToVariant,
} from './dashboardUtils'

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

// ─── Chart options ────────────────────────────────────────────────────────────
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function HelpTooltip({ text }: { text: string }) {
  return (
    <AppTooltip content={text} ariaLabel={text}>
      <span className="w-4 h-4 rounded-full bg-transparent border border-neutral-900 text-neutral-900 text-[10px] flex items-center justify-center cursor-help select-none leading-none font-medium">
        ?
      </span>
    </AppTooltip>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="app-section-title mb-3">{children}</h2>
}

interface BadgeProps { text: string; variant: BadgeVariant; hint?: string }
function Badge({ text, variant, hint }: BadgeProps) {
  const cls = {
    brand: 'bg-brand-light text-brand-text',
    success: 'bg-success-bg text-success-text',
    warning: 'bg-warning-bg text-warning-text',
    neutral: 'bg-neutral-100 text-neutral-700',
  }[variant]

  const content = (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cls} ${hint ? 'cursor-help' : ''}`}>
      {text}
    </span>
  )

  if (!hint) return <span className="relative inline-flex">{content}</span>

  return (
    <AppTooltip content={hint} ariaLabel={hint} widthClassName="w-52">
      {content}
    </AppTooltip>
  )
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  badge?: BadgeProps
  accentClass?: string
  accentRingClass?: string
  valueClass?: string
  help?: string
}
function KpiCard({
  label, value, sub, badge,
  accentClass = 'bg-neutral-100',
  accentRingClass = 'ring-1 ring-neutral-100',
  valueClass = 'text-[var(--af-text)]',
  help,
}: KpiCardProps) {
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
  const valCls = { positive: 'text-success', negative: 'text-warning', flat: 'text-neutral-700', neutral: 'text-neutral-900' }[tone]
  const accentCls = {
    positive: 'border-l-4 border-l-success ring-1 ring-success/20',
    negative: 'border-l-4 border-l-warning ring-1 ring-warning/20',
    flat: 'border-l-4 border-l-neutral-400 ring-1 ring-neutral-100',
    neutral: 'border-l-4 border-l-neutral-400 ring-1 ring-neutral-100',
  }[tone]
  return (
    <div className={`bg-white border border-neutral-100 rounded-xl p-4 shadow-sm relative transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md ${accentCls}`}>
      {help && <span className="absolute top-3 right-3"><HelpTooltip text={help} /></span>}
      <div className="flex items-center gap-1.5 mb-1">
        <p className="app-label uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-medium leading-none truncate ${valCls}`}>{value}</p>
      {sub && <p className="app-subtitle text-xs mt-1.5 leading-snug">{sub}</p>}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SummaryTabProps {
  currency: string
  onCurrencyChange: (value: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SummaryTab({ currency, onCurrencyChange }: SummaryTabProps) {
  const today = new Date()
  const todayStr = toISODate(today)
  const yearStart = `${today.getFullYear()}-01-01`
  const dataBounds = { min: '2000-01-01', max: todayStr }

  const [period, setPeriod] = useState<Period>('Año actual')
  const [customFrom, setCustomFrom] = useState(yearStart)
  const [customTo, setCustomTo] = useState(todayStr)
  const [chartType, setChartType] = useState<ChartType>('Ingresos vs gastos')

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [aggregates, setAggregates] = useState<DashboardAggregates | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const { dateFrom, dateTo } = useMemo(() => computeDates(period, customFrom, customTo), [period, customFrom, customTo])
  const { prevFrom, prevTo } = useMemo(() => computePrevDates(period, dateFrom, dateTo), [period, dateFrom, dateTo])

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
  }, [customFrom, customTo])

  useEffect(() => {
    setLoading(true)
    const dfStr = toISODate(dateFrom) + 'T00:00:00'
    const dtStr = toISODate(dateTo) + 'T23:59:59'
    const pfStr = toISODate(prevFrom) + 'T00:00:00'
    const ptStr = toISODate(prevTo) + 'T23:59:59'
    Promise.all([
      metricsApi.dashboard(currency),
      metricsApi.aggregates({ currency, start_date: dfStr, end_date: dtStr, prev_start_date: pfStr, prev_end_date: ptStr }),
    ])
      .then(([m, agg]) => {
        setMetrics(m.data)
        setAggregates(agg.data)
      })
      .catch(() => toast('No se pudieron cargar los datos del dashboard.', 'error'))
      .finally(() => setLoading(false))
  }, [currency, dateFrom.getTime(), dateTo.getTime()])

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const netWorth = metrics ? Number(metrics.net_worth) : 0
  const income = aggregates ? Number(aggregates.income) : 0
  const expense = aggregates ? Number(aggregates.expenses) : 0
  const cashflow = income - expense
  const savingsRate = income > 0 ? (cashflow / income) * 100 : 0
  const prevIncome = aggregates ? Number(aggregates.prev_income) : 0
  const prevExpense = aggregates ? Number(aggregates.prev_expenses) : 0
  const prevCashflow = prevIncome - prevExpense
  const prevSavings = prevIncome > 0 ? (prevCashflow / prevIncome) * 100 : 0
  const hasPrev = prevIncome > 0 || prevExpense > 0

  const monthly = useMemo(() => (aggregates?.monthly ?? []).map(r => ({
    month: fmtMonthLabel(r.month),
    income: Number(r.income),
    expense: Number(r.expense),
    cashflow: Number(r.cashflow),
    cumulative: Number(r.cumulative),
  })), [aggregates])

  const catRows = useMemo(() => (aggregates?.top_categories ?? []).map(r => ({
    name: r.name,
    value: Number(r.value),
    is_fixed: r.is_fixed,
  })), [aggregates])

  const stackedRows = useMemo(() => (aggregates?.stacked ?? []).map(r => ({
    month: fmtMonthLabel(r.month),
    ...Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Number(v)])),
  })), [aggregates])
  const stackedCats = aggregates?.stacked_cats ?? []

  const balance = income - expense
  const expRatio = income > 0 ? (expense / income) * 100 : null
  const avgMonthlyExp = monthly.length > 0 ? monthly.reduce((s, r) => s + r.expense, 0) / monthly.length : 0
  const cashCoverage = avgMonthlyExp > 0 && netWorth > 0 ? netWorth / avgMonthlyExp : null
  const topCat = catRows[0] ?? null
  const topCatShare = topCat && expense > 0 ? (topCat.value / expense) * 100 : 0
  const biggestExpAmount = aggregates?.biggest_expense_amount != null ? Number(aggregates.biggest_expense_amount) : null
  const biggestExpDescription = aggregates?.biggest_expense_description ?? null
  const highestMonth = monthly.length > 0 ? monthly.reduce((a, b) => a.expense > b.expense ? a : b) : null
  const expVariation = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : null
  const fixedTotal = aggregates ? Number(aggregates.fixed_total) : 0
  const fixedShare = expense > 0 ? (fixedTotal / expense) * 100 : null

  const fixedVarData = [
    { name: 'Gasto fijo', value: fixedTotal },
    { name: 'Gasto variable', value: expense - fixedTotal },
  ]

  const incomeBadge = deltaBadge(income, prevIncome)
  const expenseBadge = deltaBadge(expense, prevExpense, true)
  const cashflowBadge = deltaBadge(cashflow, prevCashflow)
  const savingsBadge = deltaPointsBadge(savingsRate, prevSavings, hasPrev)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size={8} />
    </div>
  )

  return (
    <>
      {/* Filters */}
      <FilterCard sticky>
        <div className="flex flex-col gap-1">
          <label className="app-label">Período</label>
          <Select
            value={period}
            onChange={v => setPeriod(v as Period)}
            options={['Año actual', 'Últimos 90 días', 'Últimos 30 días', 'Personalizado'].map(v => ({ value: v, label: v }))}
            className="w-44"
          />
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
          <Select
            value={currency}
            onChange={onCurrencyChange}
            options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }]}
            className="w-24"
          />
        </div>
      </FilterCard>

      {/* KPI strip */}
      <section>
        <SectionTitle>Indicadores clave</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Patrimonio neto"
            value={fmt(netWorth, currency)}
            accentClass="bg-brand"
            accentRingClass="ring-2 ring-brand/20"
            valueClass="text-brand"
            sub="saldo actual"
            badge={{ text: cashflowBadge.text, variant: toneToVariant(cashflowBadge.tone, 'brand'), hint: hasPrev ? `El flujo neto del período anterior fue ${fmt(prevCashflow, currency)}. Un flujo positivo mejora tu patrimonio acumulado.` : 'No hay período anterior para comparar.' }}
            help={KPI_HELP['Patrimonio neto']}
          />
          <KpiCard
            label="Ingresos"
            value={fmt(income, currency)}
            accentClass="bg-success"
            accentRingClass="ring-2 ring-success/20"
            valueClass="text-success"
            sub="total del período"
            badge={{ text: incomeBadge.text, variant: toneToVariant(incomeBadge.tone, 'success'), hint: hasPrev ? `En el período anterior tus ingresos fueron ${fmt(prevIncome, currency)}. ${incomeBadge.tone === 'positive' ? 'Generaste más ingresos, buen ritmo.' : incomeBadge.tone === 'negative' ? 'Tus ingresos cayeron respecto al período previo.' : 'Ingresos estables.'}` : 'No hay período anterior para comparar.' }}
            help={KPI_HELP['Ingresos']}
          />
          <KpiCard
            label="Gastos"
            value={fmt(expense, currency)}
            accentClass="bg-warning"
            accentRingClass="ring-2 ring-warning/20"
            valueClass="text-warning"
            sub="total del período"
            badge={{ text: expenseBadge.text, variant: toneToVariant(expenseBadge.tone, 'warning'), hint: hasPrev ? `En el período anterior tus gastos fueron ${fmt(prevExpense, currency)}. ${expenseBadge.tone === 'positive' ? 'Gastaste menos que antes, bien.' : expenseBadge.tone === 'negative' ? 'Tus gastos aumentaron respecto al período previo.' : 'Gasto estable.'}` : 'No hay período anterior para comparar.' }}
            help={KPI_HELP['Gastos']}
          />
          <KpiCard
            label="Tasa de ahorro"
            value={income === 0 ? 'Sin datos' : `${Math.abs(savingsRate) >= 999 ? (savingsRate > 0 ? '>999' : '<-999') : savingsRate.toFixed(1)}%`}
            sub={income > 0 ? (savingsRate >= 20 ? 'margen saludable' : savingsRate >= 5 ? 'margen moderado' : 'margen bajo') : 'sin ingresos'}
            accentClass="bg-brand-deep"
            accentRingClass="ring-2 ring-brand-deep/20"
            valueClass="text-brand-deep"
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
          <InsightCard label="Movimientos" value={`${(aggregates?.transaction_count ?? 0).toLocaleString('es-CO')}`} sub="Transacciones en el período" tone="neutral" help={INSIGHT_HELP['Movimientos']} />
          <InsightCard
            label="Relación gastos/ingresos"
            value={expRatio != null ? `${expRatio.toFixed(1)}%` : 'Sin datos'}
            sub={expRatio != null ? `${expRatio <= 70 ? 'saludable' : expRatio <= 90 ? 'moderado' : 'alto'} · ${fmt(expense, currency)} de ${fmt(income, currency)}` : 'No hay ingresos'}
            tone={expRatio == null ? 'neutral' : expRatio <= 70 ? 'positive' : expRatio <= 90 ? 'flat' : 'negative'}
            help={INSIGHT_HELP['Relación gastos/ingresos']}
          />
          <InsightCard label="Mayor impacto" value={topCat?.name ?? 'Sin gastos'} sub={topCat ? `${topCatShare.toFixed(1)}% del gasto · ${fmt(topCat.value, currency)}` : 'No hay egresos suficientes'} tone="neutral" help={INSIGHT_HELP['Mayor impacto']} />
          <InsightCard label="Mayor gasto individual" value={biggestExpAmount != null ? fmt(biggestExpAmount, currency) : 'Sin gastos'} sub={biggestExpDescription ?? 'No hay egresos registrados'} tone="negative" help={INSIGHT_HELP['Mayor gasto individual']} />
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

          {chartType === 'Ingresos vs gastos' && (
            monthly.length > 0
              ? <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthly} barGap={4} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="month" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} cursor={false} />
                    <Legend wrapperStyle={{ fontSize: 12, color: CHART_LEGEND }} />
                    <Bar dataKey="income" name="Ingresos" fill={CHART_INCOME} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Gastos" fill={CHART_EXPENSE} radius={[4, 4, 0, 0]} />
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
                    <Bar dataKey="value" name="Gasto" radius={[0, 4, 4, 0]}>
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
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11, color: CHART_LEGEND }} formatter={(v: string) => v.length > 14 ? v.slice(0, 14) + '…' : v} />
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
                    <Bar dataKey="value" name="Gasto" radius={[4, 4, 0, 0]}>
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

      {(aggregates?.transaction_count ?? 0) === 0 && (
        <div className="app-card p-10 text-center app-subtitle">
          <p className="text-lg mb-1">Sin transacciones en este período</p>
          <p className="text-sm">Ajusta el filtro de fechas o importa movimientos.</p>
        </div>
      )}
    </>
  )
}
