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
        return { bg: 'bg-red-100', bar: 'bg-red-500', text: 'text-red-700' }
      case 'warning':
        return { bg: 'bg-amber-100', bar: 'bg-amber-500', text: 'text-amber-700' }
      default:
        return { bg: 'bg-green-100', bar: 'bg-green-500', text: 'text-green-700' }
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
          <p className={`text-xs font-medium mt-1 ${colors.text}`}>
            {getStatusLabel()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(budget)}
            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
          >
            {t('planning.budget.edit')}
          </button>
          <button
            onClick={() => onDelete(budget.id)}
            className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
          >
            {t('planning.budget.delete')}
          </button>
        </div>
      </div>

      {/* Amount Info */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-500">{t('planning.budget.spent')}</p>
          <p className="font-medium">${budget.current_spent}</p>
        </div>
        <div>
          <p className="text-gray-500">{t('planning.budget.limit')}</p>
          <p className="font-medium">${budget.amount_limit}</p>
        </div>
        <div>
          <p className="text-gray-500">{t('planning.budget.remaining')}</p>
          <p className={`font-medium ${budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${budget.remaining}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${colors.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-gray-500">
        {percentage.toFixed(0)}% {t('planning.budget.of_limit')}
      </p>
    </div>
  )
}
