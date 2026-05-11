import { useTranslation } from 'react-i18next'
import DeleteButton from '@/components/ui/DeleteButton'
import EditButton from '@/components/ui/EditButton'
import type { BudgetRead } from '@/api/budgets'

interface BudgetCardProps {
  budget: BudgetRead
  categoryName: string
  onEdit: (budget: BudgetRead) => void
  onDelete: (budget: BudgetRead) => void
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
  const cardAccentClass = budget.status === 'ok'
    ? 'border-l-success ring-1 ring-success/20'
    : 'border-l-warning ring-1 ring-warning/20'

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
    <div className={`bg-white border border-neutral-100 border-l-4 rounded-xl p-4 shadow-sm space-y-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md ${cardAccentClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-sm text-neutral-900">{categoryName}</h3>
          <p className={`inline-flex mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
            {getStatusLabel()}
          </p>
        </div>
        <div className="flex gap-2">
          <EditButton onClick={() => onEdit(budget)} label={t('planning.budget.edit')} />
          <DeleteButton onClick={() => onDelete(budget)} label={t('planning.budget.delete')} />
        </div>
      </div>

      {/* Amount Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="app-label uppercase tracking-wider">{t('planning.budget.spent')}</p>
          <p className="font-medium text-neutral-900 mt-1">${budget.current_spent}</p>
        </div>
        <div>
          <p className="app-label uppercase tracking-wider">{t('planning.budget.limit')}</p>
          <p className="font-medium text-neutral-900 mt-1">${budget.amount_limit}</p>
        </div>
        <div>
          <p className="app-label uppercase tracking-wider">{t('planning.budget.remaining')}</p>
          <p className={`font-medium mt-1 ${budget.remaining >= 0 ? 'text-success' : 'text-warning'}`}>
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

      <p className="app-subtitle text-xs">
        {percentage.toFixed(0)}% {t('planning.budget.of_limit')}
      </p>
    </div>
  )
}
