import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BudgetCard from '@/components/planning/BudgetCard'
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

  const handleDeleteBudget = async (budgetId: number) => {
    if (confirm(t('planning.budget.confirm_delete'))) {
      deleteBudget.mutate(budgetId)
    }
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
    <div className="app-shell w-full mx-auto space-y-6 md:space-y-8 max-w-[1440px] rounded-2xl p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="app-title text-xl">{t('planning.budgets.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">
          {t('planning.budgets.subtitle')}
        </p>
      </div>

      {/* Month Selector */}
      <div className="app-card p-4 flex items-center justify-between">
        <button
          onClick={handlePreviousMonth}
          className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 transition"
        >
          ←
        </button>
        <div className="text-center flex-1">
          <p className="font-semibold capitalize">{monthName}</p>
        </div>
        <button
          onClick={handleNextMonth}
          className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 transition"
        >
          →
        </button>
      </div>

      {/* Create New Budget Button */}
      <button
        onClick={handleCreateNew}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition"
      >
        + {t('planning.budget.new')}
      </button>

      {/* Budgets Grid */}
      {budgetsLoading ? (
        <div className="text-center py-8 text-gray-500">
          {t('common.loading')}
        </div>
      ) : !budgetData || budgetData.budgets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>{t('planning.budget.empty')}</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="app-card p-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">{t('planning.budget.total_limit')}</p>
              <p className="font-semibold text-lg">${budgetData.total_limit}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('planning.budget.total_spent')}</p>
              <p className="font-semibold text-lg">${budgetData.total_spent}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('planning.budget.total_remaining')}</p>
              <p
                className={`font-semibold text-lg ${
                  budgetData.total_limit - budgetData.total_spent >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
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

      {/* Budget Form Modal */}
      {formMode && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="app-card w-full sm:w-full max-w-md sm:rounded-2xl rounded-t-2xl p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {formMode === 'create'
                ? t('planning.budget.new')
                : t('planning.budget.edit')}
            </h2>

            {formMode === 'create' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('planning.budget.category')}
                </label>
                <select
                  value={formData.category_id || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: Number(e.target.value) })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value={0} disabled>
                    {t('planning.budget.select_category')}
                  </option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('planning.budget.amount_limit')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount_limit}
                onChange={(e) =>
                  setFormData({ ...formData, amount_limit: Number(e.target.value) })
                }
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                placeholder="0.00"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setFormMode(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium text-sm hover:bg-gray-200 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmitForm}
                disabled={createBudget.isPending || updateBudget.isPending}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {formMode === 'create' ? t('common.create') : t('common.update')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
