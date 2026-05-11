import type { FinancialHealthSnapshot } from '@/types'
import { scoreTone } from './helpers'

interface FinancialHealthFactorsGridProps {
  factors: FinancialHealthSnapshot['factors']
  t: (key: string, params?: Record<string, string | number>) => string
}

export default function FinancialHealthFactorsGrid({
  factors,
  t,
}: FinancialHealthFactorsGridProps) {
  return (
    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {factors.map((factor) => {
        const tone = scoreTone(factor.score)
        const accentCls = {
          positive: 'bg-success',
          negative: 'bg-warning',
          flat: 'bg-brand-deep',
        }[tone]
        const ringCls = {
          positive: 'ring-success/20',
          negative: 'ring-warning/20',
          flat: 'ring-brand-deep/20',
        }[tone]

        return (
          <div key={factor.key} className={`app-card p-4 space-y-2 ring-1 ${ringCls} bg-gradient-to-br from-white to-neutral-50/80`}>
            <div className="flex items-center justify-between gap-2">
              <p className="app-label uppercase tracking-wider">{t(`dashboard.health_factor_${factor.key}`)}</p>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white border border-neutral-100 text-neutral-700">
                {factor.score}/100
              </span>
            </div>
            <div className="w-full rounded-full bg-neutral-100 h-2.5 overflow-hidden">
              <div className={`h-full ${accentCls}`} style={{ width: `${Math.max(0, Math.min(100, factor.score))}%` }} />
            </div>
            <p className="app-subtitle text-xs">
              {t('dashboard.health_factor_value', {
                value: factor.unit === '%' ? `${factor.value.toFixed(1)}%` : `${factor.value.toFixed(1)} ${t('dashboard.insight_unit_months')}`,
              })}
            </p>
            <p className="app-subtitle text-xs">
              {t('dashboard.health_factor_target', {
                target: factor.unit === '%' ? `${factor.target.toFixed(1)}%` : `${factor.target.toFixed(1)} ${t('dashboard.insight_unit_months')}`,
              })}
            </p>
          </div>
        )
      })}
    </div>
  )
}
