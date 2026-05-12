import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import FinancialHealthFactorsGrid from './FinancialHealthFactorsGrid'
import FinancialHealthHistoryCard from './FinancialHealthHistoryCard'
import FinancialHealthScoreCard from './FinancialHealthScoreCard'
import FinancialHealthWeeklyPlanCard from './FinancialHealthWeeklyPlanCard'
import type { FinancialHealthSnapshot } from '@/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (!params) return key
      return `${key} ${Object.entries(params).map(([k, v]) => `${k}:${v}`).join(' ')}`
    },
  }),
}))

vi.mock('@/components/ui/Tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const t = (key: string, params?: Record<string, string | number>) => {
  if (!params) return key
  return `${key} ${Object.entries(params).map(([k, v]) => `${k}:${v}`).join(' ')}`
}

const snapshot: FinancialHealthSnapshot = {
  score: 72,
  level: 'stable',
  factors: [
    { key: 'savings', score: 70, value: 14.5, target: 20, unit: '%', weight: 0.35 },
    { key: 'debt', score: 65, value: 32, target: 25, unit: '%', weight: 0.25 },
  ],
  weekly_plan: [
    {
      factor: 'savings',
      priority: 'medium',
      action_key: 'increase_savings_rate',
      target_value: 18,
      target_unit: '%',
      estimated_score_gain: 6,
    },
  ],
  history: [
    {
      month: '2026-04',
      score: 70,
      delta: 2,
      change_driver: 'savings',
      change_direction: 'up',
    },
  ],
}

describe('financial health subcomponents', () => {
  it('should render score card when a snapshot is provided', () => {
    render(
      <FinancialHealthScoreCard
        financialHealth={snapshot}
        historyCount={1}
        deltaBadge={{ text: '+2.0 pp', tone: 'positive' }}
        t={t}
      />,
    )

    expect(screen.getByText('72')).toBeInTheDocument()
  })

  it('should render factor labels when factors exist', () => {
    render(<FinancialHealthFactorsGrid factors={snapshot.factors} t={t} />)

    expect(screen.getByText('dashboard.health_factor_savings')).toBeInTheDocument()
  })

  it('should render action label when weekly plan contains items', () => {
    render(<FinancialHealthWeeklyPlanCard weeklyPlan={snapshot.weekly_plan} t={t} />)

    expect(screen.getByText('dashboard.health_factor_savings')).toBeInTheDocument()
  })

  it('should render empty message when history is not provided', () => {
    render(<FinancialHealthHistoryCard history={[]} t={t} />)

    expect(screen.getByText('dashboard.chart_empty')).toBeInTheDocument()
  })
})
