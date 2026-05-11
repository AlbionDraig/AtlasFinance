import type { FinancialHealthHistoryPoint, FinancialHealthSnapshot } from '@/types'
import type { DeltaBadge, HealthBadgeVariant } from './types'

export function scoreTone(score: number): 'positive' | 'negative' | 'flat' {
  if (score >= 80) return 'positive'
  if (score >= 60) return 'flat'
  return 'negative'
}

export function scoreLevelLabel(level: 'strong' | 'stable' | 'attention', t: (key: string) => string): string {
  if (level === 'strong') return t('dashboard.health_level_strong')
  if (level === 'stable') return t('dashboard.health_level_stable')
  return t('dashboard.health_level_attention')
}

export function actionPriorityLabel(priority: 'high' | 'medium' | 'low', t: (key: string) => string): string {
  if (priority === 'high') return t('dashboard.health_priority_high')
  if (priority === 'medium') return t('dashboard.health_priority_medium')
  return t('dashboard.health_priority_low')
}

export function actionPriorityStyles(priority: 'high' | 'medium' | 'low'): string {
  if (priority === 'high') return 'border-l-warning bg-warning-bg/35'
  if (priority === 'medium') return 'border-l-brand bg-brand-light/40'
  return 'border-l-neutral-300 bg-neutral-50'
}

export function historyChangeLabel(
  point: FinancialHealthHistoryPoint,
  t: (key: string) => string,
): string {
  if (point.delta == null) return t('dashboard.health_history_baseline')
  if (point.change_driver === 'stable' || point.change_direction === 'stable') {
    return t('dashboard.health_history_stable')
  }
  return t(`dashboard.health_history_${point.change_driver}_${point.change_direction}`)
}

export function historyDeltaTone(direction: 'up' | 'down' | 'stable'): string {
  if (direction === 'up') return 'text-success'
  if (direction === 'down') return 'text-warning'
  return 'text-neutral-700'
}

export function actionDescription(
  action: FinancialHealthSnapshot['weekly_plan'][number],
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const target = action.target_unit === '%'
    ? `${action.target_value.toFixed(1)}%`
    : `${action.target_value.toFixed(1)} ${t('dashboard.insight_unit_months')}`

  return t(`dashboard.health_action_${action.action_key}`, {
    target,
    gain: action.estimated_score_gain,
  })
}

export function toneToVariant(tone: DeltaBadge['tone']): HealthBadgeVariant {
  if (tone === 'positive') return 'success'
  if (tone === 'negative') return 'brand'
  if (tone === 'flat') return 'neutral'
  return 'neutral'
}
