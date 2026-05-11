import type { FinancialHealthSnapshot } from '@/types'
import { actionDescription, actionPriorityLabel, actionPriorityStyles } from './helpers'
import { FinancialHealthBadge, FinancialHealthHelpTooltip } from './shared'

interface FinancialHealthWeeklyPlanCardProps {
  weeklyPlan: FinancialHealthSnapshot['weekly_plan']
  t: (key: string, params?: Record<string, string | number>) => string
  compact?: boolean
}

function factorInitial(factor: FinancialHealthSnapshot['weekly_plan'][number]['factor']): string {
  if (factor === 'savings') return 'A'
  if (factor === 'debt') return 'D'
  if (factor === 'liquidity') return 'L'
  return 'V'
}

export default function FinancialHealthWeeklyPlanCard({
  weeklyPlan,
  t,
  compact = false,
}: FinancialHealthWeeklyPlanCardProps) {
  return (
    <div className="app-card p-4 space-y-3 bg-white/90 ring-1 ring-neutral-100">
      <div className="flex items-center justify-between gap-2">
        <p className="app-label uppercase tracking-wider">{t('dashboard.health_weekly_plan')}</p>
        {!compact && <FinancialHealthHelpTooltip text={t('dashboard.health_weekly_plan_help')} />}
      </div>
      {weeklyPlan.length > 0 ? (
        <div className="space-y-2.5">
          {weeklyPlan.map((action, idx) => (
            <div key={`${action.factor}-${idx}`} className={`border border-neutral-100 border-l-4 rounded-lg p-3 ${actionPriorityStyles(action.priority)} motion-safe:transition-all motion-safe:duration-300 hover:shadow-sm`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-white border border-neutral-100 text-[11px] font-medium text-neutral-700">
                    {factorInitial(action.factor)}
                  </span>
                  <p className="text-sm font-medium text-neutral-900">
                    {t(`dashboard.health_factor_${action.factor}`)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-light text-brand-text">
                    +{action.estimated_score_gain} {t('dashboard.health_points_short')}
                  </span>
                  <FinancialHealthBadge
                    text={actionPriorityLabel(action.priority, t)}
                    variant={action.priority === 'high' ? 'warning' : action.priority === 'medium' ? 'brand' : 'neutral'}
                  />
                </div>
              </div>
              <p className="app-subtitle text-xs leading-relaxed">{actionDescription(action, t)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="app-subtitle text-sm">{t('dashboard.chart_empty')}</p>
      )}
    </div>
  )
}
