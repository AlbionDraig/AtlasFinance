import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BudgetCard from '@/components/planning/BudgetCard'
import AmountInput from '@/components/ui/AmountInput'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { useBudgetsByMonth, useCreateBudget, useDeleteBudget, useUpdateBudget } from '@/hooks/useBudgets'
import { useCategoriesData } from '@/hooks/useCategoriesData'
import type { Category } from '@/api/categories'
import type { BudgetCreatePayload, BudgetRead } from '@/api/budgets'

type BudgetFormMode = 'create' | 'edit' | null

interface BudgetFormData extends BudgetCreatePayload {
  categoryId?: number
}

/**
 * Budgets management page - display monthly budgets with traffic light status.
 */
export default function BudgetsPage() {
  const { t } = useTranslation()
  const [currentDate] = useState(new Date())
  const [year, setYear] = useState(currentDate.getFullYear())
  const [month, setMonth] = useState(currentDate.getMonth() + 1)

  const [formMode, setFormMode] = useState<BudgetFormMode>(null)
  const [editingBudget, setEditingBudget] = useState<BudgetRead | null>(null)
  const [deletingBudget, setDeletingBudget] = useState<BudgetRead | null>(null)
  const [formData, setFormData] = useState<BudgetFormData>({
    category_id: 0,
    year,
    month,
    amount_limit: 0,
  })

  const { data: budgetData, isLoading: budgetsLoading } = useBudgetsByMonth(year, month)
  const { categories } = useCategoriesData()
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const deleteBudget = useDeleteBudget()

  // Create a mapping from category ID to category name
  const categoryMap = categories
    ? Object.fromEntries(categories.map((cat: Category) => [cat.id, cat.name]))
    : {}

  const handlePreviousMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const handleCreateNew = () => {
    setEditingBudget(null)
    setFormData({
      category_id: categories?.[0]?.id ?? 0,
      year,
      month,
      amount_limit: 0,
    })
    setFormMode('create')
  }

  const handleEditBudget = (budget: BudgetRead) => {
    setEditingBudget(budget)
    setFormData({
      category_id: budget.category_id,
      year: budget.year,
      month: budget.month,
      amount_limit: parseFloat(String(budget.amount_limit)),
    })
    setFormMode('edit')
  }

  const handleDeleteBudget = (budget: BudgetRead) => {
    setDeletingBudget(budget)
  }

  const handleConfirmDeleteBudget = () => {
    if (!deletingBudget) return

    deleteBudget.mutate(deletingBudget.id, {
      onSettled: () => {
        setDeletingBudget(null)
      },
    })
  }

  const handleSubmitForm = async () => {
    try {
      if (formMode === 'create') {
        await createBudget.mutateAsync({
          category_id: formData.category_id || 0,
          year: formData.year,
          month: formData.month,
          amount_limit: formData.amount_limit,
        })
      } else if (formMode === 'edit' && editingBudget) {
        await updateBudget.mutateAsync({
          id: editingBudget.id,
          payload: {
            amount_limit: formData.amount_limit,
          },
        })
      }
      setFormMode(null)
    } catch (error) {
      console.error('Error submitting budget:', error)
    }
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="app-title text-xl">{t('planning.budgets.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">
          {t('planning.budgets.subtitle')}
        </p>
      </div>

      {/* Month Selector */}
      <div className="app-card p-4 flex items-center justify-between gap-3">
        <button
          onClick={handlePreviousMonth}
          className="h-9 w-9 rounded-lg border border-neutral-100 text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          ←
        </button>
        <div className="text-center flex-1">
          <p className="font-medium capitalize text-neutral-900">{monthName}</p>
        </div>
        <button
          onClick={handleNextMonth}
          className="h-9 w-9 rounded-lg border border-neutral-100 text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          →
        </button>
      </div>

      {/* Create New Budget Button */}
      <button
        onClick={handleCreateNew}
        className="app-btn-primary"
      >
        + {t('planning.budget.new')}
      </button>

      {/* Budgets Grid */}
      {budgetsLoading ? (
        <div className="text-center py-8 text-neutral-400">
          {t('common.loading')}
        </div>
      ) : !budgetData || budgetData.budgets.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          <p>{t('planning.budget.empty')}</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="app-card p-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-neutral-400">{t('planning.budget.total_limit')}</p>
              <p className="font-medium text-base text-neutral-900">${budgetData.total_limit}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">{t('planning.budget.total_spent')}</p>
              <p className="font-medium text-base text-neutral-900">${budgetData.total_spent}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">{t('planning.budget.total_remaining')}</p>
              <p
                className={`font-medium text-base ${
                  budgetData.total_limit - budgetData.total_spent >= 0
                    ? 'text-success'
                    : 'text-warning'
                }`}
              >
                ${budgetData.total_limit - budgetData.total_spent}
              </p>
            </div>
          </div>

          {/* Budgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetData.budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                categoryName={categoryMap[budget.category_id] || `Category ${budget.category_id}`}
                onEdit={handleEditBudget}
                onDelete={handleDeleteBudget}
              />
            ))}
          </div>
        </>
      )}

      {deletingBudget && (
        <ConfirmDeleteModal
          title={t('common.delete_item', { name: categoryMap[deletingBudget.category_id] || `Category ${deletingBudget.category_id}` })}
          description={t('planning.budget.confirm_delete')}
          loading={deleteBudget.isPending}
          onConfirm={handleConfirmDeleteBudget}
          onClose={() => setDeletingBudget(null)}
        />
      )}

      {/* Budget Form Modal */}
      {formMode && (
        <Modal onClose={() => setFormMode(null)} maxWidth="max-w-md">
          <div className="app-card w-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <h2 className="text-lg font-medium text-neutral-900">
                {formMode === 'create'
                  ? t('planning.budget.new')
                  : t('planning.budget.edit')}
              </h2>
              <button
                type="button"
                onClick={() => setFormMode(null)}
                className="h-8 w-8 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                aria-label={t('common.close')}
              >
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-5">
              {formMode === 'create' && (
                <FormField label={t('planning.budget.category')}>
                  <Select
                    value={String(formData.category_id || '')}
                    onChange={(value) => setFormData({ ...formData, category_id: Number(value) })}
                    options={[
                      { value: '', label: t('planning.budget.select_category') },
                      ...categories.map((cat) => ({ value: String(cat.id), label: cat.name })),
                    ]}
                    className="w-full"
                    active={Boolean(formData.category_id)}
                  />
                </FormField>
              )}

              <FormField label={t('planning.budget.amount_limit')}>
                <AmountInput
                  value={formData.amount_limit ? String(formData.amount_limit) : ''}
                  onChange={(raw) => setFormData({ ...formData, amount_limit: Number(raw || '0') })}
                  currency="COP"
                  className="w-full"
                  placeholder="0.00"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleSubmitForm}
                  disabled={createBudget.isPending || updateBudget.isPending}
                  className="app-btn-primary disabled:opacity-50"
                >
                  {formMode === 'create' ? t('common.create') : t('common.update')}
                </button>
                <button
                  onClick={() => setFormMode(null)}
                  className="app-btn-secondary"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
