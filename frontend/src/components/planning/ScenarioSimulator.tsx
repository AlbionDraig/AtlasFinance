import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="app-card w-full sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-2xl rounded-t-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('planning.simulator.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {!results ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t('planning.simulator.description')}
            </p>

            {/* Category selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('planning.simulator.category')}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reduction percentage slider */}
            <div>
              <label className="block text-sm font-medium mb-2">
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
              <p className="text-xs text-gray-500 mt-1">
                {t('planning.simulator.reduction_help')}
              </p>
            </div>

            {/* Months ahead slider */}
            <div>
              <label className="block text-sm font-medium mb-2">
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
              <p className="text-xs text-gray-500 mt-1">
                {t('planning.simulator.months_help')}
              </p>
            </div>

            {/* Simulate button */}
            <button
              onClick={handleSimulate}
              disabled={simulationMutation.isPending}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {simulationMutation.isPending
                ? t('planning.simulator.simulating')
                : t('planning.simulator.simulate')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-blue-900">
                {t('planning.simulator.results')}
              </p>
            </div>

            {results.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                {t('planning.simulator.no_goals')}
              </p>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.goal_id}
                    className="border border-gray-200 rounded-lg p-3 space-y-2"
                  >
                    <p className="font-medium text-sm">{result.goal_name}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">
                          {t('planning.simulator.current')}
                        </p>
                        <p className="font-medium">${result.current_amount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">
                          {t('planning.simulator.projected')}
                        </p>
                        <p className="font-medium text-blue-600">
                          ${result.projected_amount}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        {t('planning.simulator.progress')}:
                        {result.projected_progress_percent.toFixed(1)}%
                      </span>
                      {result.will_reach_target ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                          ✓ {t('planning.simulator.will_reach')}
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium">
                          {t('planning.simulator.will_not_reach')}
                        </span>
                      )}
                    </div>

                    {result.days_to_target && (
                      <p className="text-xs text-gray-500">
                        ⏱ {t('planning.simulator.days_to_reach')}: {result.days_to_target}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Back button */}
            <button
              onClick={() => setResults(null)}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium text-sm hover:bg-gray-200 transition"
            >
              {t('planning.simulator.back')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
