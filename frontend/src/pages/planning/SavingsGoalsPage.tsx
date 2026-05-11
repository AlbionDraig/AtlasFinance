import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import SavingsGoalCard from '@/components/planning/SavingsGoalCard'
import ScenarioSimulator from '@/components/planning/ScenarioSimulator'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import {
  useSavingsGoals,
  useCreateSavingsGoal,
  useDeleteSavingsGoal,
  useUpdateSavingsGoal,
} from '@/hooks/useSavingsGoals'
import { useCategoriesData } from '@/hooks/useCategoriesData'
import type { Category } from '@/api/categories'
import type { SavingsGoalRead, SavingsGoalCreatePayload, SavingsGoalUpdatePayload } from '@/api/savings_goals'

type FormMode = 'create' | 'edit' | null

/**
 * Savings goals page - display savings goals with progress and scenario simulator.
 */
export default function SavingsGoalsPage() {
  const { t } = useTranslation()
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [editingGoal, setEditingGoal] = useState<SavingsGoalRead | null>(null)
  const [simulatorOpen, setSimulatorOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount: '',
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
      target_date: goal.target_date.split('T')[0],
    })
    setFormMode('edit')
  }

  const handleDeleteGoal = async (goalId: number) => {
    if (confirm(t('planning.goal.confirm_delete'))) {
      deleteGoal.mutate(goalId)
    }
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
      } else if (formMode === 'edit' && editingGoal) {
        await updateGoal.mutateAsync({
          id: editingGoal.id,
          payload: {
            name: formData.name,
            description: formData.description || undefined,
            target_amount: Number(formData.target_amount),
            target_date: formData.target_date,
          } as SavingsGoalUpdatePayload,
        })
      }
      setFormMode(null)
    } catch (error) {
      console.error('Error submitting goal:', error)
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="app-card p-3 text-center">
            <p className="text-xs text-neutral-400">{t('planning.goals.total_goals')}</p>
            <p className="text-xl font-medium text-brand">{stats.total_goals}</p>
          </div>
          <div className="app-card p-3 text-center">
            <p className="text-xs text-neutral-400">{t('planning.goals.completed')}</p>
            <p className="text-xl font-medium text-success">{stats.completed}</p>
          </div>
          <div className="app-card p-3 text-center">
            <p className="text-xs text-neutral-400">{t('planning.goals.total_target')}</p>
            <p className="text-lg font-medium text-neutral-900">${stats.total_target.toFixed(2)}</p>
          </div>
          <div className="app-card p-3 text-center">
            <p className="text-xs text-neutral-400">{t('planning.goals.total_saved')}</p>
            <p className="text-lg font-medium text-brand">${stats.total_saved.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleCreateNew}
          className="app-btn-primary"
        >
          + {t('planning.goal.new')}
        </button>
        {categories && categories.length > 0 && (
          <button
            onClick={() => setSimulatorOpen(true)}
            className="app-btn-secondary"
          >
            {t('planning.goal.simulator')}
          </button>
        )}
      </div>

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
    </div>
  )
}
