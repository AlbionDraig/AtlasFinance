import type { FinancialHealthSnapshot } from '@/types'
import { scoreTone } from './helpers'

interface FinancialHealthFactorsGridProps {
  factors: FinancialHealthSnapshot['factors']
  t: (key: string, params?: Record<string, string | number>) => string
  compact?: boolean
}

export default function FinancialHealthFactorsGrid({
  factors,
  t,
  compact = false,
}: FinancialHealthFactorsGridProps) {
  return (
    <div className={compact ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3'}>
      {factors.map((factor) => {
        const tone = scoreTone(factor.score)
        const barCls = {
          positive: 'bg-success',
          negative: 'bg-warning',
          flat: 'bg-brand-deep',
        }[tone]
        const cardToneCls = {
          positive: 'border-l-4 border-l-success ring-1 ring-success/20',
          negative: 'border-l-4 border-l-warning ring-1 ring-warning/20',
          flat: 'border-l-4 border-l-brand-deep ring-1 ring-brand-deep/20',
        }[tone]
        const scoreToneCls = {
          positive: 'text-success',
          negative: 'text-warning',
          flat: 'text-brand-deep',
        }[tone]

        return (
          <div key={factor.key} className={`bg-white border border-neutral-100 rounded-xl shadow-sm relative transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md ${compact ? 'p-3 space-y-2' : 'p-4 space-y-2.5'} ${cardToneCls}`}>
            <div className="flex items-center justify-between gap-2">
              <p className={`app-label uppercase tracking-wider ${compact ? 'text-xs' : 'text-sm'}`}>{t(`dashboard.health_factor_${factor.key}`)}</p>
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium px-2 py-0.5 rounded-full bg-white border border-neutral-100 ${scoreToneCls}`}>
                {factor.score}/100
              </span>
            </div>
            <div className={`w-full rounded-full bg-neutral-100 ${compact ? 'h-1.5' : 'h-2.5'} overflow-hidden`}>
              <div
                className={`h-full ${barCls} motion-safe:transition-all motion-safe:duration-700`}
                style={{ width: `${Math.max(0, Math.min(100, factor.score))}%` }}
              />
            </div>
            <div className={`grid grid-cols-2 ${compact ? 'gap-1 text-sm' : 'gap-2 text-sm'}`}>
              <div>
                <p className="app-label text-[10px] uppercase tracking-wider">{t('dashboard.health_label_actual')}</p>
                <p className="text-neutral-900 mt-0.5">
                  {factor.unit === '%' ? `${factor.value.toFixed(1)}%` : `${factor.value.toFixed(1)} ${t('dashboard.insight_unit_months')}`}
                </p>
              </div>
              <div className="text-right">
                <p className="app-label text-[10px] uppercase tracking-wider">{t('dashboard.health_label_target')}</p>
                <p className="text-neutral-900 mt-0.5">
                  {factor.unit === '%' ? `${factor.target.toFixed(1)}%` : `${factor.target.toFixed(1)} ${t('dashboard.insight_unit_months')}`}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
