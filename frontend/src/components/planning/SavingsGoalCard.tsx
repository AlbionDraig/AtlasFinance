import { useTranslation } from 'react-i18next'
import type { SavingsGoalRead } from '@/api/savings_goals'

interface SavingsGoalCardProps {
  goal: SavingsGoalRead
  onEdit: (goal: SavingsGoalRead) => void
  onDelete: (goalId: number) => void
}

/**
 * Savings goal card component showing progress towards target with visual indicators.
 */
export default function SavingsGoalCard({
  goal,
  onEdit,
  onDelete,
}: SavingsGoalCardProps) {
  const { t } = useTranslation()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="app-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-sm">{goal.name}</h3>
          {goal.description && (
            <p className="text-xs text-gray-500 mt-1">{goal.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(goal)}
            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
          >
            {t('planning.goal.edit')}
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
          >
            {t('planning.goal.delete')}
          </button>
        </div>
      </div>

      {/* Amount info */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-500">{t('planning.goal.saved')}</p>
          <p className="font-medium">${goal.current_amount}</p>
        </div>
        <div>
          <p className="text-gray-500">{t('planning.goal.target')}</p>
          <p className="font-medium">${goal.target_amount}</p>
        </div>
        <div>
          <p className="text-gray-500">{t('planning.goal.remaining')}</p>
          <p className="font-medium">
            ${parseFloat(String(goal.target_amount)) - parseFloat(String(goal.current_amount))}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-gray-700">
            {t('planning.goal.progress')}
          </span>
          <span className="text-xs font-semibold text-blue-600">
            {goal.progress_percent.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              goal.is_completed ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, goal.progress_percent)}%` }}
          />
        </div>
      </div>

      {/* Target date and remaining days */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {t('planning.goal.target_date')}: {formatDate(goal.target_date)}
        </span>
        <span className={`font-medium ${
          goal.days_remaining <= 30
            ? 'text-red-600'
            : goal.days_remaining <= 90
              ? 'text-amber-600'
              : 'text-gray-600'
        }`}>
          {goal.days_remaining} {t('planning.goal.days_left')}
        </span>
      </div>

      {/* Completion status */}
      {goal.is_completed && (
        <div className="p-2 bg-green-50 rounded border border-green-200">
          <p className="text-xs font-medium text-green-700 text-center">
            ✓ {t('planning.goal.completed_message')}
          </p>
        </div>
      )}
    </div>
  )
}
