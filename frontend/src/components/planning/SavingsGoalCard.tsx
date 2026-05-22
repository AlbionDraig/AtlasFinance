import { useTranslation } from 'react-i18next'
import DeleteButton from '@/components/ui/DeleteButton'
import EditButton from '@/components/ui/EditButton'
import type { SavingsGoalRead } from '@/api/savings_goals'
import { formatSavingsGoalDescription } from '@/lib/utils'

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
  const { t, i18n } = useTranslation()
  const progress = Math.min(100, Math.max(0, goal.progress_percent))
  const progressVisualClass = progress >= 100
    ? {
        card: 'border-l-success/80 ring-1 ring-success/10',
        text: 'text-success',
        bar: 'bg-success',
      }
    : progress >= 50
      ? {
          card: 'border-l-warning/80 ring-1 ring-warning/12',
          text: 'text-warning',
          bar: 'bg-warning',
        }
      : {
          card: 'border-l-brand/80 ring-1 ring-brand/10',
          text: 'text-brand',
          bar: 'bg-brand',
        }
  const displayDescription = formatSavingsGoalDescription(goal.description, i18n.resolvedLanguage ?? i18n.language)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const locale = i18n.resolvedLanguage?.startsWith('es') ? 'es-CO' : 'en-US'
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className={`bg-white border border-neutral-100 border-l-4 rounded-xl p-4 shadow-sm space-y-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md ${progressVisualClass.card}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-neutral-900 leading-snug">{goal.name}</h3>
          {displayDescription && (
            <p className="text-xs mt-1 leading-snug text-neutral-500">{displayDescription}</p>
          )}
          {goal.pocket_name && (
            <p className="text-[11px] mt-1 text-neutral-500">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <p className="app-label uppercase tracking-wider">{t('planning.goal.saved')}</p>
          <p className="text-sm font-semibold text-neutral-900 mt-1 tabular-nums">${goal.current_amount}</p>
        </div>
        <div>
          <p className="app-label uppercase tracking-wider">{t('planning.goal.target')}</p>
          <p className="text-sm font-semibold text-neutral-900 mt-1 tabular-nums">${goal.target_amount}</p>
        </div>
        <div>
          <p className="app-label uppercase tracking-wider">{t('planning.goal.remaining')}</p>
          <p className="text-sm font-semibold text-neutral-900 mt-1 tabular-nums">
            ${parseFloat(String(goal.target_amount)) - parseFloat(String(goal.current_amount))}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="pt-0.5">
        <div className="flex justify-between items-center mb-1.5">
          <span className="app-label uppercase tracking-wider text-neutral-700">
            {t('planning.goal.progress')}
          </span>
          <span className={`text-xs font-medium ${progressVisualClass.text}`}>
            {goal.progress_percent.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-neutral-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${progressVisualClass.bar}`}
            style={{ width: `${Math.min(100, goal.progress_percent)}%` }}
          />
        </div>
      </div>

      {/* Target date and remaining days */}
      <div className="flex items-center justify-between text-xs pt-0.5">
        <span className="text-xs text-neutral-500">
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

    </div>
  )
}
