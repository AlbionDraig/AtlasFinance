import type { FinancialHealthSnapshot } from '@/types'
import { scoreLevelLabel, toneToVariant } from './helpers'
import type { DeltaBadge } from './types'
import { FinancialHealthBadge } from './shared'

interface FinancialHealthScoreCardProps {
  financialHealth: FinancialHealthSnapshot | null
  historyCount: number
  deltaBadge: DeltaBadge
  t: (key: string) => string
}

export default function FinancialHealthScoreCard({
  financialHealth,
  historyCount,
  deltaBadge,
  t,
}: FinancialHealthScoreCardProps) {
  const healthScore = financialHealth?.score ?? 0
  const healthLevel = financialHealth?.level ?? 'attention'

  return (
    <div className="app-card p-5 lg:col-span-1 ring-2 ring-brand/20 relative overflow-hidden bg-gradient-to-br from-brand-light/70 via-white to-white">
      <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-brand/10 blur-2xl" />
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand" />
      <div className="flex items-center justify-between gap-3 mb-3 relative">
        <p className="app-label uppercase tracking-wider">{t('dashboard.health_score_title')}</p>
        <FinancialHealthBadge
          text={deltaBadge.text}
          variant={toneToVariant(deltaBadge.tone)}
          hint={t('dashboard.health_history_hint')}
        />
      </div>
      <div className="flex items-center gap-4 relative">
        <div
          className="h-20 w-20 rounded-full p-1.5"
          style={{
            background: `conic-gradient(var(--af-brand) ${Math.max(0, Math.min(100, healthScore))}%, rgba(214, 223, 230, 0.45) 0%)`,
          }}
        >
          <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-brand text-2xl font-medium">
            {healthScore}
          </div>
        </div>
        <div className="space-y-1">
          <p className="app-subtitle text-sm leading-snug">{scoreLevelLabel(healthLevel, t)}</p>
          <p className="text-xs text-neutral-700">
            {t('dashboard.health_history_title')}: {historyCount}
          </p>
        </div>
      </div>
    </div>
  )
}
