import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE } from '@/lib/chartTheme'
import { historyChangeLabel, historyDeltaTone } from './helpers'
import { FinancialHealthHelpTooltip } from './shared'
import type { HealthHistoryPointView } from './types'

interface FinancialHealthHistoryCardProps {
  history: HealthHistoryPointView[]
  t: (key: string) => string
  compact?: boolean
}

export default function FinancialHealthHistoryCard({
  history,
  t,
  compact = false,
}: FinancialHealthHistoryCardProps) {
  const formatScoreDelta = (delta: number | null): string => {
    if (delta == null) return `0 ${t('dashboard.health_points_short')}`
    const normalized = Number.isInteger(delta) ? String(delta) : delta.toFixed(1)
    return `${delta > 0 ? '+' : ''}${normalized} ${t('dashboard.health_points_short')}`
  }

  const scoreBadgeClass = (score: number): string => {
    if (score >= 80) return 'bg-success-bg text-success-text ring-success/20'
    if (score >= 60) return 'bg-warning-bg text-warning-text ring-warning/20'
    return 'bg-brand-light text-brand-text ring-brand/20'
  }

  const deltaBadgeClass = (direction: 'up' | 'down' | 'stable'): string => {
    if (direction === 'up') return 'bg-success-bg text-success-text ring-success/20'
    if (direction === 'down') return 'bg-brand-light text-brand-text ring-brand/20'
    return 'bg-warning-bg text-warning-text ring-warning/20'
  }

  const rowAccentClass = (direction: 'up' | 'down' | 'stable'): string => {
    if (direction === 'up') return 'border-l-4 border-l-success'
    if (direction === 'down') return 'border-l-4 border-l-brand'
    return 'border-l-4 border-l-warning'
  }

  const scoreStatusIcon = (score: number): string => {
    if (score >= 80) return '▲'
    if (score >= 60) return '●'
    return '▼'
  }

  const directionIcon = (direction: 'up' | 'down' | 'stable'): string => {
    if (direction === 'up') return '▲'
    if (direction === 'down') return '▼'
    return '●'
  }

  return (
    <div className="app-card p-4 space-y-3 bg-gradient-to-br from-white via-neutral-50/60 to-brand-light/25 ring-1 ring-neutral-100 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="app-label uppercase tracking-wider">{t('dashboard.health_history_title')}</p>
          {!compact && <p className="text-[11px] text-neutral-600">Últimos 3 cambios registrados</p>}
        </div>
        {!compact && <FinancialHealthHelpTooltip text={t('dashboard.health_history_help')} />}
      </div>

      {history.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={history} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="healthScoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--af-accent)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--af-accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <ReferenceLine y={80} stroke="var(--af-positive)" strokeDasharray="4 4" strokeOpacity={0.35} />
              <ReferenceLine y={60} stroke="var(--af-accent-deep)" strokeDasharray="4 4" strokeOpacity={0.25} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_TICK, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fill: CHART_TICK, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                formatter={(value: unknown) => `${Math.round(Number(value ?? 0))}/100`}
                labelFormatter={(value: unknown) => String(value ?? '')}
                cursor={false}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="none"
                fill="url(#healthScoreFill)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="score"
                name={t('dashboard.health_score_title')}
                stroke="var(--af-accent)"
                strokeWidth={3}
                dot={{ r: 3.5, fill: 'var(--af-surface)', stroke: 'var(--af-accent)', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: 'var(--af-accent)', stroke: 'var(--af-surface)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {history.slice(-3).reverse().map((point) => (
              <div
                key={point.month}
                className={`group grid grid-cols-[1fr_auto] items-start gap-3 text-xs rounded-xl px-3 py-2.5 bg-gradient-to-r from-white to-neutral-50 border border-neutral-100 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${rowAccentClass(point.change_direction)}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-neutral-100 text-neutral-700">
                      {point.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${scoreBadgeClass(point.score)}`}>
                      <span aria-hidden="true" className="text-[9px] leading-none">{scoreStatusIcon(point.score)}</span>
                      <span>{point.score}/100</span>
                    </span>
                  </div>
                  <p className="app-subtitle mt-1 leading-relaxed text-neutral-700">
                    {historyChangeLabel(point, t)}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 shadow-sm ${deltaBadgeClass(point.change_direction)} ${historyDeltaTone(point.change_direction)}`}>
                  <span aria-hidden="true" className="text-[10px] leading-none">{directionIcon(point.change_direction)}</span>
                  <span>{formatScoreDelta(point.delta)}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="app-subtitle text-sm">{t('dashboard.chart_empty')}</p>
      )}
    </div>
  )
}
