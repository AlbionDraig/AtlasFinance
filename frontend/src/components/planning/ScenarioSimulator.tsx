import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Select from '@/components/ui/Select'
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
    <div className="fixed inset-0 bg-neutral-900/45 flex items-end sm:items-center justify-center z-50">
      <div className="app-card w-full sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-2xl rounded-t-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-neutral-900">{t('planning.simulator.title')}</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {!results ? (
          <div className="space-y-4">
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
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {t('planning.simulator.reduction')}: {reductionPercent}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={reductionPercent}
                onChange={(e) => setReductionPercent(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-neutral-400 mt-1">
                {t('planning.simulator.reduction_help')}
              </p>
            </div>

            {/* Months ahead slider */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {t('planning.simulator.months')}: {monthsAhead}
              </label>
              <input
                type="range"
                min="1"
                max="60"
                value={monthsAhead}
                onChange={(e) => setMonthsAhead(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-neutral-400 mt-1">
                {t('planning.simulator.months_help')}
              </p>
            </div>

            {/* Simulate button */}
            <button
              onClick={handleSimulate}
              disabled={simulationMutation.isPending}
              className="w-full rounded-lg border border-brand bg-brand text-white py-2 text-sm font-medium hover:bg-brand-hover hover:border-brand-hover disabled:opacity-50 transition-colors"
            >
              {simulationMutation.isPending
                ? t('planning.simulator.simulating')
                : t('planning.simulator.simulate')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
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
              className="w-full rounded-lg border border-neutral-100 bg-neutral-50 text-neutral-700 py-2 text-sm font-medium hover:bg-neutral-100 transition-colors"
            >
              {t('planning.simulator.back')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
