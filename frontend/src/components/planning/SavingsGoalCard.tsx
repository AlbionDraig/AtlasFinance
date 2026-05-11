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
  const cardAccentClass = goal.is_completed
    ? 'border-l-success ring-1 ring-success/20'
    : 'border-l-brand ring-1 ring-brand/15'

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className={`bg-white border border-neutral-100 border-l-4 rounded-xl p-4 shadow-sm space-y-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md ${cardAccentClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-sm text-neutral-900">{goal.name}</h3>
          {goal.description && (
            <p className="app-subtitle text-xs mt-1 leading-snug">{goal.description}</p>
          )}
          {goal.pocket_name && (
            <p className="app-subtitle text-[11px] mt-1">
              {t('planning.goal.linked_pocket')}: {goal.pocket_name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <EditButton onClick={() => onEdit(goal)} label={t('planning.goal.edit')} />
          <DeleteButton onClick={() => onDelete(goal)} label={t('planning.goal.delete')} />
        </div>
      </div>

      {/* Amount info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="app-label uppercase tracking-wider">{t('planning.goal.saved')}</p>
          <p className="font-medium text-neutral-900 mt-1">${goal.current_amount}</p>
        </div>
        <div>
          <p className="app-label uppercase tracking-wider">{t('planning.goal.target')}</p>
          <p className="font-medium text-neutral-900 mt-1">${goal.target_amount}</p>
        </div>
        <div>
          <p className="app-label uppercase tracking-wider">{t('planning.goal.remaining')}</p>
          <p className="font-medium text-neutral-900 mt-1">
            ${parseFloat(String(goal.target_amount)) - parseFloat(String(goal.current_amount))}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="app-label uppercase tracking-wider text-neutral-700">
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
        <span className="app-subtitle text-xs">
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
