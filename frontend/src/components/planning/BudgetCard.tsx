import { useTranslation } from 'react-i18next'
import type { BudgetRead } from '@/api/budgets'

interface BudgetCardProps {
  budget: BudgetRead
  categoryName: string
  onEdit: (budget: BudgetRead) => void
  onDelete: (budgetId: number) => void
}

/**
 * Budget card component showing spending vs limit with traffic light status.
 */
export default function BudgetCard({
  budget,
  categoryName,
  onEdit,
  onDelete,
}: BudgetCardProps) {
  const { t } = useTranslation()

  // Calculate percentage for progress bar
  const percentage = Math.min(
    100,
    (parseFloat(String(budget.current_spent)) /
      parseFloat(String(budget.amount_limit))) *
      100
  )

  // Determine colors based on status
  const getStatusColor = () => {
    switch (budget.status) {
      case 'exceeded':
        return { bg: 'bg-warning-bg', bar: 'bg-warning', text: 'text-warning-text' }
      case 'warning':
        return { bg: 'bg-warning-bg', bar: 'bg-warning', text: 'text-warning-text' }
      default:
        return { bg: 'bg-success-bg', bar: 'bg-success', text: 'text-success-text' }
    }
  }

  const colors = getStatusColor()

  const getStatusLabel = () => {
    switch (budget.status) {
      case 'exceeded':
        return t('planning.budget.status_exceeded')
      case 'warning':
        return t('planning.budget.status_warning')
      default:
        return t('planning.budget.status_ok')
    }
  }

  return (
    <div className="app-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-sm">{categoryName}</h3>
          <p className={`inline-flex mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
            {getStatusLabel()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(budget)}
            className="text-xs px-2 py-1 rounded border border-neutral-100 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            {t('planning.budget.edit')}
          </button>
          <button
            onClick={() => onDelete(budget.id)}
            className="text-xs px-2 py-1 rounded border border-warning bg-warning-bg text-warning-text hover:opacity-90 transition-opacity"
          >
            {t('planning.budget.delete')}
          </button>
        </div>
      </div>

      {/* Amount Info */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-neutral-400">{t('planning.budget.spent')}</p>
          <p className="font-medium">${budget.current_spent}</p>
        </div>
        <div>
          <p className="text-neutral-400">{t('planning.budget.limit')}</p>
          <p className="font-medium">${budget.amount_limit}</p>
        </div>
        <div>
          <p className="text-neutral-400">{t('planning.budget.remaining')}</p>
          <p className={`font-medium ${budget.remaining >= 0 ? 'text-success' : 'text-warning'}`}>
            ${budget.remaining}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-neutral-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${colors.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-neutral-400">
        {percentage.toFixed(0)}% {t('planning.budget.of_limit')}
      </p>
    </div>
  )
}
