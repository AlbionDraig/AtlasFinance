import type { FinancialHealthSnapshot } from '@/types'
import { actionDescription, actionPriorityLabel, actionPriorityStyles } from './helpers'
import { FinancialHealthBadge, FinancialHealthHelpTooltip } from './shared'

interface FinancialHealthWeeklyPlanCardProps {
  weeklyPlan: FinancialHealthSnapshot['weekly_plan']
  t: (key: string, params?: Record<string, string | number>) => string
}

export default function FinancialHealthWeeklyPlanCard({
  weeklyPlan,
  t,
}: FinancialHealthWeeklyPlanCardProps) {
  return (
    <div className="app-card p-4 space-y-3 bg-white/90 ring-1 ring-neutral-100">
      <div className="flex items-center justify-between gap-2">
        <p className="app-label uppercase tracking-wider">{t('dashboard.health_weekly_plan')}</p>
        <FinancialHealthHelpTooltip text={t('dashboard.health_weekly_plan_help')} />
      </div>
      {weeklyPlan.length > 0 ? (
        <div className="space-y-2">
          {weeklyPlan.map((action, idx) => (
            <div key={`${action.factor}-${idx}`} className={`border border-neutral-100 border-l-4 rounded-lg p-3 ${actionPriorityStyles(action.priority)}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-neutral-900">
                  {t(`dashboard.health_factor_${action.factor}`)}
                </p>
                <FinancialHealthBadge
                  text={actionPriorityLabel(action.priority, t)}
                  variant={action.priority === 'high' ? 'warning' : action.priority === 'medium' ? 'brand' : 'neutral'}
                />
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
