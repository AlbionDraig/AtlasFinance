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
  return (
    <div className="app-card p-4 space-y-3 bg-white/90 ring-1 ring-neutral-100">
      <div className="flex items-center justify-between gap-2">
        <p className="app-label uppercase tracking-wider">{t('dashboard.health_history_title')}</p>
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
          <div className="space-y-1.5">
            {history.slice(-3).reverse().map((point) => (
              <div key={point.month} className="flex items-center justify-between gap-3 text-xs border border-neutral-100 rounded-md px-2.5 py-1.5 bg-white">
                <p className="app-subtitle">
                  {point.label}: {historyChangeLabel(point, t)}
                </p>
                <p className={`font-medium ${historyDeltaTone(point.change_direction)}`}>
                  {point.delta != null ? `${point.delta > 0 ? '+' : ''}${point.delta}` : '0'}
                </p>
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
