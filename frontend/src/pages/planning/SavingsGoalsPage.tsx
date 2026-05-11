import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import SavingsGoalCard from '@/components/planning/SavingsGoalCard'
import ScenarioSimulator from '@/components/planning/ScenarioSimulator'
import AmountInput from '@/components/ui/AmountInput'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import DatePicker from '@/components/ui/DatePicker'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import {
  useSavingsGoals,
  useCreateSavingsGoal,
  useDeleteSavingsGoal,
  useUpdateSavingsGoal,
} from '@/hooks/useSavingsGoals'
import { useCategoriesData } from '@/hooks/useCategoriesData'
import { getApiErrorMessage } from '@/lib/utils'
import type { Category } from '@/api/categories'
import type { SavingsGoalRead, SavingsGoalCreatePayload, SavingsGoalUpdatePayload } from '@/api/savings_goals'

type FormMode = 'create' | 'edit' | null

/**
 * Savings goals page - display savings goals with progress and scenario simulator.
 */
export default function SavingsGoalsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [editingGoal, setEditingGoal] = useState<SavingsGoalRead | null>(null)
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoalRead | null>(null)
  const [simulatorOpen, setSimulatorOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount: '',
    current_amount: '',
    target_date: '',
  })

  const { data: goals, isLoading } = useSavingsGoals()
  const { categories } = useCategoriesData()
  const createGoal = useCreateSavingsGoal()
  const updateGoal = useUpdateSavingsGoal()
  const deleteGoal = useDeleteSavingsGoal()

  const handleCreateNew = () => {
    setEditingGoal(null)
    setFormData({
      name: '',
      description: '',
      target_amount: '',
      current_amount: '',
      target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    })
    setFormMode('create')
  }

  const handleEditGoal = (goal: SavingsGoalRead) => {
    setEditingGoal(goal)
    setFormData({
      name: goal.name,
      description: goal.description || '',
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      target_date: goal.target_date.split('T')[0],
    })
    setFormMode('edit')
  }

  const handleDeleteGoal = (goal: SavingsGoalRead) => {
    setDeletingGoal(goal)
  }

  const handleConfirmDeleteGoal = () => {
    if (!deletingGoal) return

    const goalName = deletingGoal.name

    deleteGoal.mutate(deletingGoal.id, {
      onSuccess: () => {
        toast(t('planning.goal.toast_deleted', { name: goalName }))
      },
      onError: (error) => {
        toast(getApiErrorMessage(error, t('planning.goal.toast_delete_error')), 'error')
      },
      onSettled: () => {
        setDeletingGoal(null)
      },
    })
  }

  const handleSubmitForm = async () => {
    try {
      if (formMode === 'create') {
        await createGoal.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
          target_amount: Number(formData.target_amount),
          target_date: formData.target_date,
        } as SavingsGoalCreatePayload)
        toast(t('planning.goal.toast_created'))
      } else if (formMode === 'edit' && editingGoal) {
        await updateGoal.mutateAsync({
          id: editingGoal.id,
          payload: {
            name: formData.name,
            description: formData.description || undefined,
            target_amount: Number(formData.target_amount),
            current_amount: formData.current_amount ? Number(formData.current_amount) : undefined,
            target_date: formData.target_date,
          } as SavingsGoalUpdatePayload,
        })
        toast(t('planning.goal.toast_updated'))
      }
      setFormMode(null)
    } catch (error) {
      const fallback = formMode === 'create'
        ? t('planning.goal.toast_create_error')
        : t('planning.goal.toast_update_error')
      toast(getApiErrorMessage(error, fallback), 'error')
    }
  }

  // Calculate overall statistics
  const stats = goals
    ? {
        total_goals: goals.length,
        completed: goals.filter((g: SavingsGoalRead) => g.is_completed).length,
        total_target: goals.reduce((sum: number, g: SavingsGoalRead) => sum + parseFloat(String(g.target_amount)), 0),
        total_saved: goals.reduce((sum: number, g: SavingsGoalRead) => sum + parseFloat(String(g.current_amount)), 0),
      }
    : { total_goals: 0, completed: 0, total_target: 0, total_saved: 0 }

  const statsCardClass = 'bg-white border border-neutral-100 rounded-xl p-4 shadow-sm relative transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md'
  const hasSavedAmount = stats.total_saved > 0

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="app-title text-xl">{t('planning.goals.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">
          {t('planning.goals.subtitle')}
        </p>
      </div>

      {/* Statistics Cards */}
      {goals && goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className={`${statsCardClass} border-l-4 border-l-neutral-400 ring-1 ring-neutral-100`}>
            <p className="app-label uppercase tracking-wider">{t('planning.goals.total_goals')}</p>
            <p className="text-2xl font-medium leading-none text-neutral-900 mt-1">{stats.total_goals}</p>
          </div>
          <div className={`${statsCardClass} border-l-4 border-l-success ring-1 ring-success/20`}>
            <p className="app-label uppercase tracking-wider">{t('planning.goals.completed')}</p>
            <p className="text-2xl font-medium leading-none text-success mt-1">{stats.completed}</p>
          </div>
          <div className={`${statsCardClass} border-l-4 border-l-neutral-400 ring-1 ring-neutral-100`}>
            <p className="app-label uppercase tracking-wider">{t('planning.goals.total_target')}</p>
            <p className="text-2xl font-medium leading-none text-neutral-900 mt-1">${stats.total_target.toFixed(2)}</p>
          </div>
          <div className={`${statsCardClass} border-l-4 ${hasSavedAmount ? 'border-l-success ring-1 ring-success/20' : 'border-l-neutral-400 ring-1 ring-neutral-100'}`}>
            <p className="app-label uppercase tracking-wider">{t('planning.goals.total_saved')}</p>
            <p className={`text-2xl font-medium leading-none mt-1 ${hasSavedAmount ? 'text-success' : 'text-neutral-900'}`}>${stats.total_saved.toFixed(2)}</p>
          </div>
        </div>
      )}



      {/* Goals List */}
      {isLoading ? (
        <div className="text-center py-8 text-neutral-400">
          {t('common.loading')}
        </div>
      ) : !goals || goals.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          <p>{t('planning.goal.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal: SavingsGoalRead) => (
            <SavingsGoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEditGoal}
              onDelete={handleDeleteGoal}
            />
          ))}
        </div>
      )}

      {deletingGoal && (
        <ConfirmDeleteModal
          title={t('common.delete_item', { name: deletingGoal.name })}
          description={t('planning.goal.confirm_delete')}
          loading={deleteGoal.isPending}
          onConfirm={handleConfirmDeleteGoal}
          onClose={() => setDeletingGoal(null)}
        />
      )}

      {/* Goal Form Modal */}
      {formMode && (
        <Modal onClose={() => setFormMode(null)} maxWidth="max-w-md">
          <div className="app-card w-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <h2 className="text-lg font-medium text-neutral-900">
                {formMode === 'create'
                  ? t('planning.goal.new')
                  : t('planning.goal.edit')}
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
              <FormField label={t('planning.goal.name')}>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('planning.goal.name_placeholder')}
                  className="app-control"
                />
              </FormField>

              <FormField label={t('planning.goal.description')}>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('planning.goal.description_placeholder')}
                  rows={2}
                  className="w-full rounded-lg border border-neutral-100 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors hover:bg-neutral-50 focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
              </FormField>

              <FormField label={t('planning.goal.target_amount')}>
                <AmountInput
                  value={formData.target_amount}
                  onChange={(raw) => setFormData({ ...formData, target_amount: raw })}
                  currency="COP"
                  className="w-full"
                  placeholder="0.00"
                />
              </FormField>

              {formMode === 'edit' && (
                <FormField label={t('planning.goal.saved')}>
                  <AmountInput
                    value={formData.current_amount}
                    onChange={(raw) => setFormData({ ...formData, current_amount: raw })}
                    currency="COP"
                    className="w-full"
                    placeholder="0.00"
                  />
                </FormField>
              )}

              <DatePicker
                label={t('planning.goal.target_date')}
                value={formData.target_date}
                onChange={(value) => setFormData({ ...formData, target_date: value })}
                className="w-full"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleSubmitForm}
                  disabled={createGoal.isPending || updateGoal.isPending}
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

      {/* Scenario Simulator Modal */}
      <ScenarioSimulator
        categories={(categories || []).map((cat: Category) => ({ id: cat.id, name: cat.name }))}
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />

      <FloatingActionMenu
        hidden={formMode !== null}
        ariaLabel={t('common.actions')}
        items={[
          {
            key: 'create-goal',
            label: t('planning.goal.new'),
            onClick: handleCreateNew,
            icon: (
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            ),
          },
          ...(categories && categories.length > 0
            ? [
                {
                  key: 'simulator',
                  label: t('planning.goal.simulator'),
                  onClick: () => setSimulatorOpen(true),
                  icon: (
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                      <path d="M13 6H7m6 0L10 3M7 6L10 3m6 8h-6m6 0l-3-3m-3 3l3-3M6 14h4m0 0l-2-2m2 2l2-2M4 18h12a2 2 0 002-2v-4m-16 4a2 2 0 002 2h12a2 2 0 002-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  )
}
