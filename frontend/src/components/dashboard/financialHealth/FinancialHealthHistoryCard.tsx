import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_GRID, CHART_NEUTRAL, CHART_TICK, CHART_TOOLTIP_STYLE } from '@/lib/chartTheme'
import { historyChangeLabel, historyDeltaTone } from './helpers'
import { FinancialHealthHelpTooltip } from './shared'
import type { HealthHistoryPointView } from './types'

interface FinancialHealthHistoryCardProps {
  history: HealthHistoryPointView[]
  t: (key: string) => string
}

export default function FinancialHealthHistoryCard({
  history,
  t,
}: FinancialHealthHistoryCardProps) {
  return (
    <div className="app-card p-4 space-y-3 bg-white/90 ring-1 ring-neutral-100">
      <div className="flex items-center justify-between gap-2">
        <p className="app-label uppercase tracking-wider">{t('dashboard.health_history_title')}</p>
        <FinancialHealthHelpTooltip text={t('dashboard.health_history_help')} />
      </div>

      {history.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="label" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                formatter={(value: unknown) => `${Math.round(Number(value ?? 0))}/100`}
                labelFormatter={(value: unknown) => String(value ?? '')}
                cursor={false}
              />
              <Line
                type="monotone"
                dataKey="score"
                name={t('dashboard.health_score_title')}
                stroke={CHART_NEUTRAL}
                strokeWidth={2.5}
                dot={{ r: 3, fill: CHART_NEUTRAL }}
              />
            </LineChart>
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
