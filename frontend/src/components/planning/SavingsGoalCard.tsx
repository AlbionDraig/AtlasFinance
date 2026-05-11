import { useTranslation } from 'react-i18next'
import DeleteButton from '@/components/ui/DeleteButton'
import EditButton from '@/components/ui/EditButton'
import type { SavingsGoalRead } from '@/api/savings_goals'

interface SavingsGoalCardProps {
  goal: SavingsGoalRead
  onEdit: (goal: SavingsGoalRead) => void
  onDelete: (goal: SavingsGoalRead) => void
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
            <p className="text-xs text-neutral-400 mt-1">{goal.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <EditButton onClick={() => onEdit(goal)} label={t('planning.goal.edit')} />
          <DeleteButton onClick={() => onDelete(goal)} label={t('planning.goal.delete')} />
        </div>
      </div>

      {/* Amount info */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-neutral-400">{t('planning.goal.saved')}</p>
          <p className="font-medium">${goal.current_amount}</p>
        </div>
        <div>
          <p className="text-neutral-400">{t('planning.goal.target')}</p>
          <p className="font-medium">${goal.target_amount}</p>
        </div>
        <div>
          <p className="text-neutral-400">{t('planning.goal.remaining')}</p>
          <p className="font-medium">
            ${parseFloat(String(goal.target_amount)) - parseFloat(String(goal.current_amount))}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-neutral-700">
            {t('planning.goal.progress')}
          </span>
          <span className="text-xs font-medium text-brand">
            {goal.progress_percent.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-neutral-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              goal.is_completed ? 'bg-success' : 'bg-brand'
            }`}
            style={{ width: `${Math.min(100, goal.progress_percent)}%` }}
          />
        </div>
      </div>

      {/* Target date and remaining days */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-400">
          {t('planning.goal.target_date')}: {formatDate(goal.target_date)}
        </span>
        <span className={`font-medium ${
          goal.days_remaining <= 30
            ? 'text-warning'
            : goal.days_remaining <= 90
              ? 'text-warning-text'
              : 'text-neutral-700'
        }`}>
          {goal.days_remaining} {t('planning.goal.days_left')}
        </span>
      </div>

      {/* Completion status */}
      {goal.is_completed && (
        <div className="p-2 rounded border border-success bg-success-bg">
          <p className="text-xs font-medium text-success-text text-center">
            ✓ {t('planning.goal.completed_message')}
          </p>
        </div>
      )}
    </div>
  )
}
