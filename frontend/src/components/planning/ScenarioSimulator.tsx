import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Slider from '@/components/ui/Slider'
import { useScenarioSimulation } from '@/hooks/useSavingsGoals'
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
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 0)
  const [reductionPercent, setReductionPercent] = useState(15)
  const [monthsAhead, setMonthsAhead] = useState(6)
  const [results, setResults] = useState<ScenarioSimulationResponse[] | null>(null)

  const simulationMutation = useScenarioSimulation()
  const yearShortLabel = t('planning.simulator.years_short')

  const handleSimulate = async () => {
    try {
      const data = await simulationMutation.mutateAsync({
        category_id: categoryId,
        reduction_percent: reductionPercent,
        months_ahead: monthsAhead,
      })
      setResults(data)
    } catch (error) {
      console.error('Simulation failed:', error)
    }
  }

  if (!isOpen) return null

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <div className="app-card w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-lg font-medium text-neutral-900">{t('planning.simulator.title')}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {!results ? (
          <div className="space-y-4 p-5">
            <p className="text-sm text-neutral-700">
              {t('planning.simulator.description')}
            </p>

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
              size="md"
              showTicks
              tickValues={[12, 24, 36, 48, 60]}
              tickFormatter={(tick) => `${Math.round(tick / 12)}${yearShortLabel}`}
              hint={t('planning.simulator.months_help')}
            />

            {/* Simulate button */}
            <button
              onClick={handleSimulate}
              disabled={simulationMutation.isPending}
              className="app-btn-primary disabled:opacity-50"
            >
              {simulationMutation.isPending
                ? t('planning.simulator.simulating')
                : t('planning.simulator.simulate')}
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-5">
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
                        {t('planning.simulator.progress')}:
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
                        {t('planning.simulator.days_to_reach')}: {result.days_to_target}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Back button */}
            <button
              onClick={() => setResults(null)}
              className="app-btn-secondary"
            >
              {t('planning.simulator.back')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
