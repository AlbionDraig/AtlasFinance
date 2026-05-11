import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Slider from '@/components/ui/Slider'
import { useToast } from '@/hooks/useToast'
import { useScenarioSimulation } from '@/hooks/useSavingsGoals'
import { getApiErrorMessage } from '@/lib/utils'
import type { ScenarioSimulationResponse } from '@/api/savings_goals'

interface ScenarioSimulatorProps {
  categories: Array<{ id: number; name: string }>
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal component for simulating spending reduction impact on savings goals.
 */
export default function ScenarioSimulator({
  categories,
  isOpen,
  onClose,
}: ScenarioSimulatorProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 0)
  const [reductionPercent, setReductionPercent] = useState(15)
  const [monthsAhead, setMonthsAhead] = useState(6)
  const [results, setResults] = useState<ScenarioSimulationResponse[] | null>(null)

  const simulationMutation = useScenarioSimulation()
  const yearShortLabel = t('planning.simulator.years_short')
  const monthShortLabel = t('planning.simulator.months_short')

  useEffect(() => {
    if (!categories.length) {
      setCategoryId(0)
      return
    }

    const exists = categories.some((cat) => cat.id === categoryId)
    if (!exists) {
      setCategoryId(categories[0].id)
    }
  }, [categories, categoryId])

  const formatMonthsValue = (months: number) => {
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12

    if (years === 0) return `${remainingMonths}${monthShortLabel}`
    if (remainingMonths === 0) return `${years}${yearShortLabel}`
    return `${years}${yearShortLabel} ${remainingMonths}${monthShortLabel}`
  }

  const handleSimulate = async () => {
    if (!categoryId) {
      toast(t('planning.simulator.select_category_error'), 'error')
      return
    }

    try {
      const data = await simulationMutation.mutateAsync({
        category_id: categoryId,
        reduction_percent: reductionPercent,
        months_ahead: monthsAhead,
      })
      setResults(data)
    } catch (error) {
      toast(getApiErrorMessage(error, t('planning.simulator.simulation_error')), 'error')
    }
  }

  if (!isOpen) return null

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <div className="w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-100 border-t-4 border-t-brand bg-white shadow-xl overflow-hidden">
        <div className="flex items-start gap-3 border-b border-brand/10 bg-brand-light px-6 py-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M4 14.5h12M6 12V9.5m4 2.5V7m4 5v-3m-9.5 6 2.3-8.3a1 1 0 011-.7h4.4a1 1 0 011 .7L15.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="app-section-title text-brand-text">{t('planning.simulator.title')}</h2>
            <p className="text-sm text-neutral-700 mt-0.5">{t('planning.simulator.description')}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto -mt-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {!results ? (
          <div className="space-y-4 p-6">

            {/* Category selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {t('planning.simulator.category')}
              </label>
              <Select
                value={String(categoryId)}
                onChange={(value) => setCategoryId(Number(value))}
                options={categories.map((cat) => ({ value: String(cat.id), label: cat.name }))}
                className="w-full"
                disabled={!categories.length}
                active={Boolean(categoryId)}
              />
            </div>

            {/* Reduction percentage slider */}
            <Slider
              label={t('planning.simulator.reduction')}
              value={reductionPercent}
              min={0}
              max={100}
              step={1}
              onChange={setReductionPercent}
              valueSuffix="%"
              size="md"
              showTicks
              tickStep={25}
              hint={t('planning.simulator.reduction_help')}
            />

            {/* Months ahead slider */}
            <Slider
              label={t('planning.simulator.months')}
              value={monthsAhead}
              min={1}
              max={60}
              step={1}
              onChange={setMonthsAhead}
              valueFormatter={formatMonthsValue}
              size="md"
              showTicks
              tickValues={[12, 24, 36, 48, 60]}
              tickFormatter={(tick) => `${Math.round(tick / 12)}${yearShortLabel}`}
              hint={t('planning.simulator.months_help')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleSimulate}
                disabled={simulationMutation.isPending}
                className="app-btn-primary disabled:opacity-50"
              >
                {simulationMutation.isPending
                  ? t('planning.simulator.simulating')
                  : t('planning.simulator.simulate')}
              </button>
              <button
                onClick={onClose}
                disabled={simulationMutation.isPending}
                className="app-btn-secondary disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <div className="bg-brand-light border border-neutral-100 rounded-lg p-3 text-sm">
              <p className="font-medium text-brand-text">
                {t('planning.simulator.results')}
              </p>
            </div>

            {results.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">
                {t('planning.simulator.no_goals')}
              </p>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.goal_id}
                    className="border border-neutral-100 rounded-lg p-3 space-y-2"
                  >
                    <p className="font-medium text-sm">{result.goal_name}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-neutral-400">
                          {t('planning.simulator.current')}
                        </p>
                        <p className="font-medium">${result.current_amount}</p>
                      </div>
                      <div>
                        <p className="text-neutral-400">
                          {t('planning.simulator.projected')}
                        </p>
                        <p className="font-medium text-brand">
                          ${result.projected_amount}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-700">
                        {t('planning.simulator.progress')}
                        {result.projected_progress_percent.toFixed(1)}%
                      </span>
                      {result.will_reach_target ? (
                        <span className="bg-success-bg text-success-text px-2 py-1 rounded font-medium">
                          ✓ {t('planning.simulator.will_reach')}
                        </span>
                      ) : (
                        <span className="bg-warning-bg text-warning-text px-2 py-1 rounded font-medium">
                          {t('planning.simulator.will_not_reach')}
                        </span>
                      )}
                    </div>

                    {result.days_to_target && (
                      <p className="text-xs text-neutral-400">
                        {t('planning.simulator.days_to_reach')} {result.days_to_target}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => setResults(null)}
                className="app-btn-secondary"
              >
                {t('planning.simulator.back')}
              </button>
              <button
                onClick={onClose}
                className="app-btn-primary"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
