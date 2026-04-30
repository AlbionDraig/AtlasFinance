import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import InvestmentsTab from './components/InvestmentsTab'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import FilterCard from '@/components/ui/FilterCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AppTooltip from '@/components/ui/Tooltip'
import { useDashboardData } from '@/hooks/useDashboardData'

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = 'current_year' | 'last_90' | 'last_30' | 'custom'
type Tone = 'positive' | 'negative' | 'flat' | 'neutral'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}
function clampISO(value: string, min: string, max: string): string {
  if (value < min) return min
  if (value > max) return max
  return value
}
function fmtMonthLabel(yyyyMM: string, months: string[]): string {
  const [y, m] = yyyyMM.split('-')
  return `${months[parseInt(m) - 1]} ${y}`
}
function computeDates(period: Period, from: string, to: string): { dateFrom: Date; dateTo: Date } {
  const today = new Date()
  // Predefined windows are resolved relative to current day for quick filtering.
  if (period === 'current_year')
    return { dateFrom: new Date(today.getFullYear(), 0, 1), dateTo: new Date(today.getFullYear(), 11, 31) }
  if (period === 'last_90')
    return { dateFrom: new Date(today.getTime() - 89 * 86400000), dateTo: today }
  if (period === 'last_30')
    return { dateFrom: new Date(today.getTime() - 29 * 86400000), dateTo: today }
  return { dateFrom: new Date(from), dateTo: new Date(to) }
}
function computePrevDates(period: Period, dateFrom: Date, dateTo: Date): { prevFrom: Date; prevTo: Date } {
  if (period === 'current_year') {
    const y = dateFrom.getFullYear()
    return { prevFrom: new Date(y - 1, 0, 1), prevTo: new Date(y - 1, 11, 31) }
  }
  const days = Math.max(Math.round((dateTo.getTime() - dateFrom.getTime()) / 86400000) + 1, 1)
  // Previous range is contiguous and has exactly the same duration.
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
function deltaBadge(curr: number, prev: number, inverse = false): { text: string; tone: Tone } {
  // For first period there is no baseline, so percentage comparison is unavailable.
  if (prev === 0) return { text: curr === 0 ? '0%' : 'primer período', tone: 'flat' }
  const pct = ((curr - prev) / prev) * 100
  const isGood = inverse ? pct < 0 : pct > 0
  const tone: Tone = pct === 0 ? 'flat' : isGood ? 'positive' : 'negative'
  return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, tone }
}
function deltaPointsBadge(curr: number, prev: number, hasPrev: boolean): { text: string; tone: Tone } {
  // Used for ratio deltas where percentage notation can be misleading.
  if (!hasPrev) return { text: 'primer período', tone: 'flat' }
  const d = curr - prev
  return { text: `${d > 0 ? '+' : ''}${d.toFixed(1)} pp`, tone: d === 0 ? 'flat' : d > 0 ? 'positive' : 'negative' }
}
function toneFn(v: number): Tone {
  // Normalized semantic tone consumed by cards/chips.
  return v > 0 ? 'positive' : v < 0 ? 'negative' : 'flat'
}

function toneToVariant(tone: Tone, fallback: BadgeVariant = 'neutral'): BadgeVariant {
  if (tone === 'positive') return 'success'
  if (tone === 'negative') return 'brand'
  return fallback
}

// ─── Recharts tooltip style ────────────────────────────────────────────────────
const fmtTT = (v: unknown) => fmtShort(Number(v ?? 0))
const fmtTTPair = (v: unknown, name: unknown, item: { payload?: { name?: string } }): [string, string] => [
  fmtShort(Number(v ?? 0)),
  item.payload?.name ?? String(name ?? 'Monto'),
]
const CHART_TICK = 'var(--af-text-muted)'
const CHART_GRID = 'var(--af-border)'
const CHART_LEGEND = 'var(--af-text-muted)'
const TTStyle = { contentStyle: { background: 'var(--af-surface)', border: '1px solid var(--af-border)', borderRadius: '0.5rem', color: 'var(--af-text)', fontSize: 12, boxShadow: 'var(--af-shadow-md)' } }

// ─── Help descriptions are now loaded from i18n in the component ─────────────

// ─── Help tooltip ─────────────────────────────────────────────────────────────
function HelpTooltip({ text }: { text: string }) {
  return (
    <AppTooltip content={text} ariaLabel={text}>
      <span className="w-4 h-4 rounded-full bg-transparent border border-neutral-900 text-neutral-900 text-[10px] flex items-center justify-center cursor-help select-none leading-none font-medium">
        ?
      </span>
    </AppTooltip>
  )
}

// ─── Small sub-components ─────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="app-section-title mb-3">{children}</h2>
}

type BadgeVariant = 'brand' | 'success' | 'warning' | 'neutral'
interface BadgeProps { text: string; variant: BadgeVariant; hint?: string }
function Badge({ text, variant, hint }: BadgeProps) {
  const cls = {
    brand: 'bg-[#fce8e8] text-[#8a0808]',
    success: 'bg-[#e6f4ef] text-[#0f5c40]',
    warning: 'bg-[#fff4e0] text-[#8a5200]',
    neutral: 'bg-[#edeceb] text-[#4a4845]',
  }[variant]

  const content = <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cls} ${hint ? 'cursor-help' : ''}`}>{text}</span>

  if (!hint) {
    return <span className="relative inline-flex">{content}</span>
  }

  return (
    <AppTooltip content={hint} ariaLabel={hint} widthClassName="w-52">
      {content}
    </AppTooltip>
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

// ─── Chart type options ────────────────────────────────────────────────────────
// These are i18n keys mapped in the component
type ChartType = 'income_vs_expense' | 'net_flow' | 'top_categories' | 'expense_dist' | 'savings' | 'fixed_var' | 'by_category_month'

type Tab = 'resumen' | 'inversiones'

function normalizeTab(value: string | null): Tab {
  if (value === 'resumen' || value === 'inversiones') return value
  return 'resumen'
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useTranslation()
  const today = new Date()
  const todayStr = toISODate(today)
  const yearStart = `${today.getFullYear()}-01-01`

  // i18n-based period options
  const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: 'current_year', label: t('dashboard.period_current_year') },
    { value: 'last_90', label: t('dashboard.period_90d') },
    { value: 'last_30', label: t('dashboard.period_30d') },
    { value: 'custom', label: t('dashboard.period_custom') },
  ]

  // i18n-based chart options
  const CHART_KEY_MAP: Record<ChartType, string> = {
    income_vs_expense: t('dashboard.chart_income_vs_expense'),
    net_flow: t('dashboard.chart_net_flow'),
    top_categories: t('dashboard.chart_top_categories'),
    expense_dist: t('dashboard.chart_expense_dist'),
    savings: t('dashboard.chart_savings'),
    fixed_var: t('dashboard.chart_fixed_var'),
    by_category_month: t('dashboard.chart_by_category_month'),
  }

  const months = t('dashboard.months', { returnObjects: true }) as string[]

  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>(() => normalizeTab(searchParams.get('tab')))

  useEffect(() => {
    const tabFromUrl = normalizeTab(searchParams.get('tab'))
    if (tabFromUrl !== activeTab) setActiveTab(tabFromUrl)
  }, [searchParams])

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const [period, setPeriod] = useState<Period>('current_year')
  const [currency, setCurrency] = useState('COP')
  const [customFrom, setCustomFrom] = useState(yearStart)
  const [customTo, setCustomTo] = useState(todayStr)
  const dataBounds = { min: '2000-01-01', max: todayStr }
  const [chartType, setChartType] = useState<ChartType>('income_vs_expense')

  // Compute date ranges
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

  // Fetch data via hook (separa SRP: la página solo deriva y renderiza).
  const { metrics, aggregates, loading } = useDashboardData({
    currency,
    dateFrom,
    dateTo,
    prevFrom,
    prevTo,
  })

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
    month: fmtMonthLabel(r.month, months),
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
    month: fmtMonthLabel(r.month, months),
    ...Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Number(v)])),
  })), [aggregates])
  const stackedCats = aggregates?.stacked_cats ?? []

  // Insight calcs
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

  // Fixed vs variable data for chart
  const fixedVarData = [
    { name: t('dashboard.chart_label_fixed'), value: fixedTotal },
    { name: t('dashboard.chart_label_variable'), value: expense - fixedTotal },
  ]

  // Badges
  const incomeBadge = deltaBadge(income, prevIncome)
  const expenseBadge = deltaBadge(expense, prevExpense, true)
  const cashflowBadge = deltaBadge(cashflow, prevCashflow)
  const savingsBadge = deltaPointsBadge(savingsRate, prevSavings, hasPrev)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size={8} />
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] rounded-2xl p-4 md:p-6">

      {/* Header */}
      <div>
        <h1 className="app-title text-xl">{t('dashboard.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">{t('dashboard.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="app-card p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('resumen')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'resumen' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            {t('dashboard.tab_summary')}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('inversiones')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'inversiones' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            {t('dashboard.tab_investments')}
          </button>
        </div>
      </div>

      {activeTab === 'inversiones' && (
        <InvestmentsTab currency={currency} onCurrencyChange={setCurrency} />
      )}

      {activeTab === 'resumen' && (<>

      {/* Filters */}
      <FilterCard sticky>
        <div className="flex flex-col gap-1">
          <label className="app-label">{t('dashboard.label_period')}</label>
          <Select value={period} onChange={v => setPeriod(v as Period)}
            options={PERIOD_OPTIONS}
            className="w-44" />
        </div>
        <DatePicker
          label={t('dashboard.label_from')}
          value={period === 'custom' ? customFrom : toISODate(dateFrom)}
          onChange={setCustomFrom}
          min={dataBounds.min}
          max={customTo < dataBounds.max ? customTo : dataBounds.max}
          disabled={period !== 'custom'}
        />
        <DatePicker
          label={t('dashboard.label_until')}
          value={period === 'custom' ? customTo : toISODate(dateTo)}
          onChange={setCustomTo}
          min={customFrom > dataBounds.min ? customFrom : dataBounds.min}
          max={dataBounds.max}
          disabled={period !== 'custom'}
        />
        <div className="flex flex-col gap-1 ml-auto">
          <label className="app-label">{t('dashboard.label_currency')}</label>
          <Select value={currency} onChange={setCurrency}
            options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }]}
            className="w-24" />
        </div>
      </FilterCard>

      {/* KPI strip */}
      <section>
        <SectionTitle>{t('dashboard.section_kpi')}</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label={t('dashboard.kpi_net_worth')} value={fmt(netWorth, currency)} accentClass="bg-[#ca0b0b]" accentRingClass="ring-2 ring-brand/20" valueClass="text-[#ca0b0b]" sub={t('dashboard.kpi_sub_balance')} badge={{ text: cashflowBadge.text, variant: toneToVariant(cashflowBadge.tone, 'brand'), hint: hasPrev ? `${t('dashboard.delta_no_prior').replace('No', `${t('dashboard.kpi_net_worth')}: ${fmt(prevCashflow, currency)}`)}` : t('dashboard.delta_no_prior') }} help={t('dashboard.help_net_worth')} />
          <KpiCard label={t('dashboard.kpi_income')} value={fmt(income, currency)} accentClass="bg-[#0f7a55]" accentRingClass="ring-2 ring-success/20" valueClass="text-[#0f7a55]" sub={t('dashboard.kpi_sub_period')} badge={{ text: incomeBadge.text, variant: toneToVariant(incomeBadge.tone, 'success'), hint: hasPrev ? t(incomeBadge.tone === 'positive' ? 'dashboard.delta_income_up' : incomeBadge.tone === 'negative' ? 'dashboard.delta_income_down' : 'dashboard.delta_income_stable') : t('dashboard.delta_no_prior') }} help={t('dashboard.help_income')} />
          <KpiCard label={t('dashboard.kpi_expenses')} value={fmt(expense, currency)} accentClass="bg-[#c47a00]" accentRingClass="ring-2 ring-warning/20" valueClass="text-[#c47a00]" sub={t('dashboard.kpi_sub_period')} badge={{ text: expenseBadge.text, variant: toneToVariant(expenseBadge.tone, 'warning'), hint: hasPrev ? t(expenseBadge.tone === 'positive' ? 'dashboard.delta_expense_down' : expenseBadge.tone === 'negative' ? 'dashboard.delta_expense_up' : 'dashboard.delta_expense_stable') : t('dashboard.delta_no_prior') }} help={t('dashboard.help_expenses')} />
          <KpiCard
            label={t('dashboard.kpi_savings_rate')}
            value={income === 0 ? t('dashboard.kpi_sub_no_data') : `${Math.abs(savingsRate) >= 999 ? (savingsRate > 0 ? '>999' : '<-999') : savingsRate.toFixed(1)}%`}
            sub={income > 0 ? (savingsRate >= 20 ? t('dashboard.kpi_sub_margin_healthy') : savingsRate >= 5 ? t('dashboard.kpi_sub_margin_moderate') : t('dashboard.kpi_sub_margin_low')) : t('dashboard.kpi_sub_no_income')}
            accentClass="bg-[#5f0404]"
            accentRingClass="ring-2 ring-brand-deep/20"
            valueClass="text-[#5f0404]"
            badge={{ text: savingsBadge.text, variant: toneToVariant(savingsBadge.tone, 'brand'), hint: hasPrev ? t(savingsBadge.tone === 'positive' ? 'dashboard.delta_savings_up' : savingsBadge.tone === 'negative' ? 'dashboard.delta_savings_down' : 'dashboard.delta_savings_stable') : t('dashboard.delta_no_prior') }}
            help={t('dashboard.help_savings_rate')}
          />
        </div>
      </section>

      {/* Insight cards */}
      <section className="pt-1">
        <SectionTitle>Análisis del período</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InsightCard label={t('dashboard.insight_balance')} value={fmt(balance, currency)} sub={balance > 0 ? t('dashboard.insight_sub_positive') : balance < 0 ? t('dashboard.insight_sub_negative') : t('dashboard.insight_sub_balanced')} tone={toneFn(balance)} help={t('dashboard.help_balance')} />
          <InsightCard label={t('dashboard.insight_movements')} value={`${(aggregates?.transaction_count ?? 0).toLocaleString('es-CO')}`} sub={t('dashboard.insight_sub_transactions')} tone="neutral" help={t('dashboard.help_movements')} />
          <InsightCard
            label={t('dashboard.insight_expense_ratio')}
            value={expRatio != null ? `${expRatio.toFixed(1)}%` : t('dashboard.insight_sub_no_data')}
            sub={expRatio != null ? `${expRatio <= 70 ? t('dashboard.insight_sub_healthy') : expRatio <= 90 ? t('dashboard.insight_sub_moderate') : t('dashboard.insight_sub_high')} · ${fmt(expense, currency)} ${t('common.of')} ${fmt(income, currency)}` : t('dashboard.insight_sub_no_income')}
            tone={expRatio == null ? 'neutral' : expRatio <= 70 ? 'positive' : expRatio <= 90 ? 'flat' : 'negative'}
            help={t('dashboard.help_expense_ratio')}
          />
          <InsightCard label={t('dashboard.insight_top_category')} value={topCat?.name ?? t('dashboard.insight_sub_no_spending')} sub={topCat ? `${topCatShare.toFixed(1)}% · ${fmt(topCat.value, currency)}` : t('dashboard.insight_sub_no_expenses')} tone="neutral" help={t('dashboard.help_top_category')} />
          <InsightCard label={t('dashboard.insight_top_expense')} value={biggestExpAmount != null ? fmt(biggestExpAmount, currency) : t('dashboard.insight_sub_no_spending')} sub={biggestExpDescription ?? t('dashboard.insight_sub_no_expenses_reg')} tone="negative" help={t('dashboard.help_top_expense')} />
          <InsightCard
            label={t('dashboard.insight_cash_coverage')}
            value={cashCoverage != null ? `${cashCoverage.toFixed(1)} meses` : netWorth <= 0 ? fmt(netWorth, currency) : t('dashboard.insight_sub_no_ref')}
            sub={cashCoverage != null ? `Al ritmo de ${fmt(avgMonthlyExp, currency)}/mes` : t('dashboard.insight_sub_no_ref')}
            tone={cashCoverage == null ? 'neutral' : cashCoverage >= 6 ? 'positive' : cashCoverage < 1 ? 'negative' : 'flat'}
            help={t('dashboard.help_cash_coverage')}
          />
          <InsightCard label={t('dashboard.insight_worst_month')} value={highestMonth?.month ?? t('dashboard.insight_sub_no_spending')} sub={highestMonth ? `${fmt(highestMonth.expense, currency)}` : t('dashboard.insight_sub_no_months')} tone="neutral" help={t('dashboard.help_worst_month')} />
          <InsightCard
            label={t('dashboard.insight_expense_change')}
            value={expVariation != null ? `${expVariation > 0 ? '+' : ''}${expVariation.toFixed(1)}%` : t('dashboard.insight_sub_no_ref')}
            sub={expVariation != null ? `${fmt(prevExpense, currency)} → ${fmt(expense, currency)}` : t('dashboard.insight_sub_no_prior')}
            tone={expVariation == null ? 'neutral' : expVariation > 0 ? 'negative' : expVariation < 0 ? 'positive' : 'flat'}
            help={t('dashboard.help_expense_change')}
          />
          <InsightCard
            label={t('dashboard.insight_fixed_ratio')}
            value={fixedShare != null ? `${fixedShare.toFixed(1)}%` : t('dashboard.insight_sub_no_spending')}
            sub={fixedShare != null ? `${fmt(fixedTotal, currency)} / ${fmt(expense - fixedTotal, currency)}` : t('dashboard.insight_sub_no_fixed')}
            tone={fixedShare == null ? 'neutral' : fixedShare >= 60 ? 'negative' : fixedShare <= 35 ? 'positive' : 'flat'}
            help={t('dashboard.help_fixed_ratio')}
          />
        </div>
      </section>

      {/* Analysis section */}
      <section className="pt-1">
        <SectionTitle>{t('dashboard.section_charts')}</SectionTitle>
        <div className="app-panel p-5 space-y-5">
          {/* Chart type selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Select
                value={chartType}
                onChange={v => setChartType(v as ChartType)}
                options={(Object.keys(CHART_KEY_MAP) as ChartType[]).map(key => ({ value: key, label: CHART_KEY_MAP[key] }))}
                className="w-72"
              />
            </div>
            <p className="text-neutral-700 text-sm leading-relaxed w-full">{t(`dashboard.help_chart_${chartType}`)}</p>
          </div>

          {/* Charts */}
          {chartType === 'income_vs_expense' && (
            monthly.length > 0
              ? <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthly} barGap={4} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="month" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} cursor={false} />
                    <Legend wrapperStyle={{ fontSize: 12, color: CHART_LEGEND }} />
                    <Bar dataKey="income" name={t('dashboard.chart_legend_income')} fill={CHART_INCOME} radius={[4,4,0,0]} />
                    <Bar dataKey="expense" name={t('dashboard.chart_legend_expense')} fill={CHART_EXPENSE} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">{t('dashboard.chart_empty')}</p>
          )}

          {chartType === 'net_flow' && (
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
                    <Area type="monotone" dataKey="cashflow" name={t('dashboard.chart_legend_cashflow')} stroke={CHART_NEUTRAL} fill="url(#posGrad)" strokeWidth={2.5} dot={{ r: 3, fill: CHART_NEUTRAL }} />
                  </AreaChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">{t('dashboard.chart_empty')}</p>
          )}

          {chartType === 'top_categories' && (
            catRows.length > 0
              ? <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[...catRows].reverse()} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtShort} tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip {...TTStyle} formatter={fmtTT} cursor={false} />
                    <Bar dataKey="value" name={t('dashboard.chart_legend_expense')} radius={[0,4,4,0]}>
                      {[...catRows].reverse().map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">{t('dashboard.chart_empty_expenses')}</p>
          )}

          {chartType === 'expense_dist' && (
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
              : <p className="app-subtitle text-sm">{t('dashboard.chart_empty_expenses')}</p>
          )}

          {chartType === 'savings' && (
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
                    <Line type="monotone" dataKey="cumulative" name={t('dashboard.chart_legend_savings')} stroke={CHART_SAVINGS} strokeWidth={2.5} dot={{ r: 3, fill: CHART_SAVINGS }} />
                  </LineChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">{t('dashboard.chart_empty')}</p>
          )}

          {chartType === 'fixed_var' && (
            expense > 0
              ? <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={fixedVarData} barCategoryGap="40%">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="name" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TTStyle} formatter={fmtTT} cursor={false} />
                    <Bar dataKey="value" name={t('dashboard.chart_legend_expense')} radius={[4,4,0,0]}>
                      <Cell fill={CHART_EXPENSE} />
                      <Cell fill={CHART_NEUTRAL} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              : <p className="app-subtitle text-sm">{t('dashboard.chart_empty_expenses')}</p>
          )}

          {chartType === 'by_category_month' && (
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
          <p className="text-lg mb-1">{t('dashboard.empty_title')}</p>
          <p className="text-sm">{t('dashboard.empty_subtitle')}</p>
        </div>
      )}
      </>)}
    </div>
  )
}
