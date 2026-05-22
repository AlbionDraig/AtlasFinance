import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BudgetCard from '@/components/planning/BudgetCard'
import AmountInput from '@/components/ui/AmountInput'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import DeleteButton from '@/components/ui/DeleteButton'
import EditButton from '@/components/ui/EditButton'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import PageSkeleton from '@/components/ui/PageSkeleton'
import ResponsiveFilters from '@/components/ui/ResponsiveFilters'
import Select from '@/components/ui/Select'
import TableActionGroup from '@/components/ui/TableActionGroup'
import ViewToggle from '@/components/ui/ViewToggle'
import { useToast } from '@/hooks/useToast'
import { useBudgetsByMonth, useCreateBudget, useDeleteBudget, useUpdateBudget } from '@/hooks/useBudgets'
import { useCategoriesData } from '@/hooks/useCategoriesData'
import { formatCurrency, getApiErrorMessage } from '@/lib/utils'
import type { Category } from '@/api/categories'
import type { FormEvent } from 'react'
import type { BudgetCreatePayload, BudgetRead } from '@/api/budgets'

type BudgetFormMode = 'create' | 'edit' | null

interface BudgetFormData extends BudgetCreatePayload {
  categoryId?: number
}

type BudgetStatusFilter = 'all' | BudgetRead['status']

/**
 * Budgets management page - display monthly budgets with traffic light status.
 */
export default function BudgetsPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const currentDate = new Date()
  const [year, setYear] = useState(currentDate.getFullYear())
  const [month, setMonth] = useState(currentDate.getMonth() + 1)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [statusFilter, setStatusFilter] = useState<BudgetStatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

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

    const budgetLabel = getCategoryName(deletingBudget.category_id)

    deleteBudget.mutate(deletingBudget.id, {
      onSuccess: () => {
        toast(t('planning.budget.toast_deleted', { name: budgetLabel }))
      },
      onError: (error) => {
        toast(getApiErrorMessage(error, t('planning.budget.toast_delete_error')), 'error')
      },
      onSettled: () => {
        setDeletingBudget(null)
      },
    })
  }

  const handleSubmitForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      if (formMode === 'create') {
        await createBudget.mutateAsync({
          category_id: formData.category_id || 0,
          year: formData.year,
          month: formData.month,
          amount_limit: formData.amount_limit,
        })
        toast(t('planning.budget.toast_created'))
      } else if (formMode === 'edit' && editingBudget) {
        await updateBudget.mutateAsync({
          id: editingBudget.id,
          payload: {
            amount_limit: formData.amount_limit,
          },
        })
        toast(t('planning.budget.toast_updated'))
      }
      setFormMode(null)
    } catch (error) {
      const fallback = formMode === 'create'
        ? t('planning.budget.toast_create_error')
        : t('planning.budget.toast_update_error')
      toast(getApiErrorMessage(error, fallback), 'error')
    }
  }

  const monthLocale = i18n.resolvedLanguage?.startsWith('es') ? 'es-CO' : 'en-US'
  const monthName = new Date(year, month - 1).toLocaleDateString(monthLocale, {
    month: 'long',
    year: 'numeric',
  })
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: new Date(2000, index, 1).toLocaleDateString(monthLocale, { month: 'long' }),
  }))
  const baseYearOptions = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index)
  const yearOptions = Array.from(new Set([...baseYearOptions, year]))
    .sort((a, b) => a - b)
    .map((y) => ({ value: String(y), label: String(y) }))
  const activePeriodFilters = year !== currentYear || month !== currentMonth
    ? [{ id: 'period', label: monthName }]
    : []

  const totalLimit = Number(budgetData?.total_limit ?? 0)
  const totalSpent = Number(budgetData?.total_spent ?? 0)
  const totalRemaining = totalLimit - totalSpent
  const totalRemainingTone = totalRemaining > 0 ? 'positive' : totalRemaining < 0 ? 'negative' : 'neutral'
  const budgetKpis = [
    {
      key: 'total_limit',
      title: t('planning.budget.total_limit'),
      value: formatCurrency(totalLimit, 'COP'),
      accent: 'bg-brand',
      valueClass: 'text-brand-text',
    },
    {
      key: 'total_spent',
      title: t('planning.budget.total_spent'),
      value: formatCurrency(totalSpent, 'COP'),
      accent: 'bg-warning',
      valueClass: 'text-warning-text',
    },
    {
      key: 'total_remaining',
      title: t('planning.budget.total_remaining'),
      value: formatCurrency(totalRemaining, 'COP'),
      accent:
        totalRemainingTone === 'positive'
          ? 'bg-success'
          : totalRemainingTone === 'negative'
            ? 'bg-warning'
            : 'bg-neutral-400',
      valueClass:
        totalRemainingTone === 'positive'
          ? 'text-success'
          : totalRemainingTone === 'negative'
            ? 'text-warning'
            : 'text-neutral-900',
    },
  ]

  const getBudgetStatusLabel = (status: BudgetRead['status']) => {
    switch (status) {
      case 'exceeded':
        return t('planning.budget.status_exceeded')
      case 'warning':
        return t('planning.budget.status_warning')
      default:
        return t('planning.budget.status_ok')
    }
  }

  const getBudgetStatusBadgeClass = (status: BudgetRead['status']) => {
    if (status === 'ok') {
      return 'bg-success-bg text-success-text'
    }
    return 'bg-warning-bg text-warning-text'
  }

  const getCategoryName = (categoryId: number) => {
    return categoryMap[categoryId] || `${t('planning.budget.category')} #${categoryId}`
  }

  const filteredBudgets = (budgetData?.budgets ?? []).filter((budget) => {
    if (statusFilter !== 'all' && budget.status !== statusFilter) return false
    if (categoryFilter !== 'all' && String(budget.category_id) !== categoryFilter) return false
    return true
  })

  const categoryFilterOptions = (() => {
    const uniqueIds = new Set<number>((budgetData?.budgets ?? []).map((budget) => budget.category_id))
    if (categoryFilter !== 'all') uniqueIds.add(Number(categoryFilter))

    return [
      { value: 'all', label: t('planning.budget.filter_category_all') },
      ...Array.from(uniqueIds)
        .sort((a, b) => getCategoryName(a).localeCompare(getCategoryName(b)))
        .map((id) => ({
          value: String(id),
          label: getCategoryName(id),
        })),
    ]
  })()

  const activeFilters: Array<{ id: string; label: string }> = [
    ...activePeriodFilters,
    ...(statusFilter !== 'all' ? [{ id: 'status', label: getBudgetStatusLabel(statusFilter) }] : []),
    ...(categoryFilter !== 'all' ? [{ id: 'category', label: getCategoryName(Number(categoryFilter)) }] : []),
  ]

  const handleResetPeriod = () => {
    setYear(currentYear)
    setMonth(currentMonth)
  }

  const handleResetFilters = () => {
    handleResetPeriod()
    setStatusFilter('all')
    setCategoryFilter('all')
  }

  const handleRemoveFilter = (id: string) => {
    if (id === 'period') handleResetPeriod()
    if (id === 'status') setStatusFilter('all')
    if (id === 'category') setCategoryFilter('all')
  }

  if (budgetsLoading) {
    return <PageSkeleton cards={3} rows={4} columns={6} />
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="app-title text-xl">{t('planning.budgets.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">
          {t('planning.budgets.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {budgetKpis.map((kpi) => (
          <article key={kpi.key} className="app-card relative p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${kpi.accent}`} />
            <div className="flex items-center gap-1.5 mb-1">
              <p className="app-label uppercase tracking-wider">{kpi.title}</p>
            </div>

            <p className={`text-2xl font-medium leading-none ${kpi.valueClass}`}>{kpi.value}</p>

          </article>
        ))}
      </div>

      <ResponsiveFilters
        activeFilters={activeFilters}
        onResetFilters={activeFilters.length > 0 ? handleResetFilters : undefined}
        onRemoveFilter={handleRemoveFilter}
        mobileTitle={t('planning.budgets.title')}
      >
        <div className="flex flex-col gap-1 w-48">
          <label className="app-label">{t('planning.budget.filter_month')}</label>
          <Select
            value={String(month)}
            onChange={(value) => setMonth(Number(value))}
            options={monthOptions}
            className="w-full"
            active={month !== currentMonth}
          />
        </div>

        <div className="flex flex-col gap-1 w-32">
          <label className="app-label">{t('planning.budget.filter_year')}</label>
          <Select
            value={String(year)}
            onChange={(value) => setYear(Number(value))}
            options={yearOptions}
            className="w-full"
            active={year !== currentYear}
          />
        </div>

        <div className="flex flex-col gap-1 w-44">
          <label className="app-label">{t('planning.budget.filter_status_label')}</label>
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as BudgetStatusFilter)}
            options={[
              { value: 'all', label: t('planning.budget.filter_status_all') },
              { value: 'ok', label: t('planning.budget.status_ok') },
              { value: 'warning', label: t('planning.budget.status_warning') },
              { value: 'exceeded', label: t('planning.budget.status_exceeded') },
            ]}
            className="w-full"
            active={statusFilter !== 'all'}
          />
        </div>

        <div className="flex flex-col gap-1 w-56">
          <label className="app-label">{t('planning.budget.filter_category_label')}</label>
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryFilterOptions}
            className="w-full"
            active={categoryFilter !== 'all'}
          />
        </div>
      </ResponsiveFilters>



      {/* Budgets Grid */}
      {!budgetData || budgetData.budgets.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          <p>{t('planning.budget.empty')}</p>
        </div>
      ) : (
        <>
          <div className="app-card rounded-2xl p-3 md:p-4 space-y-3">
            <div className="flex justify-start">
              <ViewToggle value={viewMode} onChange={(m) => setViewMode(m as 'cards' | 'table')} />
            </div>

            {filteredBudgets.length === 0 ? (
              <div className="rounded-xl border border-neutral-100 bg-white p-6 text-center text-sm text-neutral-400">
                {t('planning.budget.empty_filter')}
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBudgets.map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    categoryName={getCategoryName(budget.category_id)}
                    onEdit={handleEditBudget}
                    onDelete={handleDeleteBudget}
                  />
                ))}
              </div>
            ) : (
              <div className="app-table-wrap">
                <table className="app-table text-sm">
                  <thead className="border-b border-brand/30 bg-brand text-xs text-white">
                    <tr>
                      <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.budget.category')}</th>
                      <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.budget.status_warning')}</th>
                      <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.budget.spent')}</th>
                      <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.budget.limit')}</th>
                      <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.budget.remaining')}</th>
                      <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('common.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBudgets.map((budget, index) => (
                      <tr
                        key={budget.id}
                        className={`border-b border-neutral-100 last:border-b-0 transition-colors hover:bg-brand-light/35 ${index % 2 === 0 ? 'bg-white' : 'bg-brand-light/10'}`}
                      >
                        <td className="px-3 py-2 text-neutral-900 font-medium">{getCategoryName(budget.category_id)}</td>
                        <td className="px-3 py-2 text-center align-middle">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getBudgetStatusBadgeClass(budget.status)}`}>
                            {getBudgetStatusLabel(budget.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-neutral-700 tabular-nums text-center align-middle">{formatCurrency(Number(budget.current_spent), 'COP')}</td>
                        <td className="px-3 py-2 text-neutral-700 tabular-nums text-center align-middle">{formatCurrency(Number(budget.amount_limit), 'COP')}</td>
                        <td className={`px-3 py-2 tabular-nums text-center align-middle ${budget.remaining >= 0 ? 'text-success' : 'text-warning'}`}>
                          {formatCurrency(Number(budget.remaining), 'COP')}
                        </td>
                        <td className="px-3 py-2 text-center align-middle">
                          <TableActionGroup>
                            <EditButton onClick={() => handleEditBudget(budget)} label={t('planning.budget.edit')} />
                            <DeleteButton onClick={() => handleDeleteBudget(budget)} label={t('planning.budget.delete')} />
                          </TableActionGroup>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {deletingBudget && (
        <ConfirmDeleteModal
          title={t('common.delete_item', { name: getCategoryName(deletingBudget.category_id) })}
          description={t('planning.budget.confirm_delete')}
          loading={deleteBudget.isPending}
          onConfirm={handleConfirmDeleteBudget}
          onClose={() => setDeletingBudget(null)}
        />
      )}

      {/* Budget Form Modal */}
      {formMode && (
        <Modal onClose={() => setFormMode(null)} maxWidth="max-w-md">
          <div className="w-full rounded-2xl border border-neutral-100 border-t-4 border-t-brand bg-white shadow-xl overflow-visible">
            <div className="flex items-start gap-3 border-b border-brand/10 bg-brand-light px-6 py-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 className="app-section-title text-brand-text">
                {formMode === 'create'
                  ? t('planning.budget.new')
                  : t('planning.budget.edit')}
              </h2>
                <p className="mt-0.5 text-sm text-neutral-700">
                  {formMode === 'create'
                    ? t('planning.budget.create_desc')
                    : t('planning.budget.edit_desc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormMode(null)}
                className="ml-auto -mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                aria-label={t('common.close')}
              >
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 p-6">
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
                  disabled={createBudget.isPending || updateBudget.isPending}
                  className="app-btn-primary disabled:opacity-50"
                >
                  {formMode === 'create' ? t('common.create') : t('common.update')}
                </button>
                <button
                  className="app-btn-secondary"
                                  type="button"
                                  onClick={() => setFormMode(null)}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      <FloatingActionMenu
        hidden={formMode !== null}
        ariaLabel={t('common.actions')}
        items={[
          {
            key: 'create-budget',
            label: t('planning.budget.new'),
            onClick: handleCreateNew,
            icon: (
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  )
}
