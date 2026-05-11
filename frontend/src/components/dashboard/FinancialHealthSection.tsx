import { useTranslation } from 'react-i18next'
import type { FinancialHealthSnapshot } from '@/types'
import FinancialHealthFactorsGrid from './financialHealth/FinancialHealthFactorsGrid'
import FinancialHealthHistoryCard from './financialHealth/FinancialHealthHistoryCard'
import FinancialHealthScoreCard from './financialHealth/FinancialHealthScoreCard'
import FinancialHealthWeeklyPlanCard from './financialHealth/FinancialHealthWeeklyPlanCard'
import type { DeltaBadge, HealthHistoryPointView } from './financialHealth/types'

interface FinancialHealthSectionProps {
  financialHealth: FinancialHealthSnapshot | null
  history: HealthHistoryPointView[]
  deltaBadge: DeltaBadge
}

export default function FinancialHealthSection({
  financialHealth,
  history,
  deltaBadge,
}: FinancialHealthSectionProps) {
  const { t } = useTranslation()

  const factors = financialHealth?.factors ?? []
  const weeklyPlan = financialHealth?.weekly_plan ?? []

  return (
    <section className="pt-1">
      <h2 className="app-section-title mb-3">{t('dashboard.section_fin_health')}</h2>
      <div className="app-panel p-5 space-y-5 bg-gradient-to-br from-brand-light/50 via-white to-neutral-50/80 ring-1 ring-brand/10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <FinancialHealthScoreCard
            financialHealth={financialHealth}
            historyCount={history.length}
            deltaBadge={deltaBadge}
            t={t}
          />
          <FinancialHealthFactorsGrid factors={factors} t={t} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <FinancialHealthWeeklyPlanCard weeklyPlan={weeklyPlan} t={t} />
          <FinancialHealthHistoryCard history={history} t={t} />
        </div>
      </div>
    </section>
  )
}
