import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { FormEvent } from 'react'
import SavingsGoalCard from '@/components/planning/SavingsGoalCard'
import ScenarioSimulator from '@/components/planning/ScenarioSimulator'
import AmountInput from '@/components/ui/AmountInput'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import DatePicker from '@/components/ui/DatePicker'
import DeleteButton from '@/components/ui/DeleteButton'
import EditButton from '@/components/ui/EditButton'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import TableActionGroup from '@/components/ui/TableActionGroup'
import ViewToggle from '@/components/ui/ViewToggle'
import { useBanksQuery, usePocketsQuery, useAccountsQuery } from '@/hooks/useCatalogQueries'
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount: '',
    current_amount: '',
    bank_id: '',
    pocket_id: '',
    target_date: '',
  })

  const { data: goals, isLoading } = useSavingsGoals()
  const { data: banks } = useBanksQuery()
  const { data: accounts } = useAccountsQuery()
  const { data: pockets } = usePocketsQuery()
  const { categories } = useCategoriesData()

  // Mapeo: banco_id -> [cuenta_id] para filtrar bolsillos por banco
  const accountsByBank = useMemo(() => {
    if (!accounts) return {}
    const map: Record<number, number[]> = {}
    accounts.forEach((acc) => {
      if (!map[acc.bank_id]) map[acc.bank_id] = []
      map[acc.bank_id].push(acc.id)
    })
    return map
  }, [accounts])

  // Bolsillos filtrados por banco seleccionado
  const filteredPockets = useMemo(() => {
    if (!pockets || !formData.bank_id) return []
    const accountIds = accountsByBank[Number(formData.bank_id)] || []
    return pockets.filter((p) => accountIds.includes(p.account_id))
  }, [pockets, formData.bank_id, accountsByBank])
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
      bank_id: '',
      pocket_id: '',
      target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    })
    setFormMode('create')
  }

  const handleEditGoal = (goal: SavingsGoalRead) => {
    setEditingGoal(goal)
    // Si la meta está vinculada a un bolsillo, obtener el banco de ese bolsillo
    const selectedPocket = goal.pocket_id ? pockets?.find((p) => p.id === goal.pocket_id) : null
    const selectedAccount = selectedPocket ? accounts?.find((a) => a.id === selectedPocket.account_id) : null
    setFormData({
      name: goal.name,
      description: goal.description || '',
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      bank_id: selectedAccount ? String(selectedAccount.bank_id) : '',
      pocket_id: goal.pocket_id ? String(goal.pocket_id) : '',
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

  const handleSubmitForm = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
    try {
      if (formMode === 'create') {
        await createGoal.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
          target_amount: Number(formData.target_amount),
          pocket_id: formData.pocket_id ? Number(formData.pocket_id) : undefined,
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
            pocket_id: formData.pocket_id ? Number(formData.pocket_id) : null,
            current_amount: !formData.pocket_id && formData.current_amount
              ? Number(formData.current_amount)
              : undefined,
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

  const formatGoalDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getDaysRemainingClass = (daysRemaining: number) => {
    if (daysRemaining <= 30) return 'text-warning'
    if (daysRemaining <= 90) return 'text-warning-text'
    return 'text-neutral-700'
  }

    if (isLoading) return <div>Loading...</div>

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
        <div className="space-y-3">
          <div className="flex justify-start">
            <ViewToggle value={viewMode} onChange={(m) => setViewMode(m as 'cards' | 'table')} />
          </div>

          {viewMode === 'cards' ? (
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
          ) : (
            <div className="app-table-wrap">
              <table className="app-table text-sm">
                <thead className="border-b border-brand/30 bg-brand text-xs text-white">
                  <tr>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.goal.name')}</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.goal.saved')}</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.goal.target')}</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.goal.remaining')}</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.goal.progress')}</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.goal.target_date')}</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('planning.goal.days_left')}</th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide text-center align-middle">{t('common.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((goal, index) => {
                    const remaining = Number(goal.target_amount) - Number(goal.current_amount)

                    return (
                      <tr
                        key={goal.id}
                        className={`border-b border-neutral-100 last:border-b-0 transition-colors hover:bg-brand-light/35 ${index % 2 === 0 ? 'bg-white' : 'bg-brand-light/10'}`}
                      >
                        <td className="px-3 py-2 text-neutral-900 font-medium">
                          <div className="max-w-[240px]">
                            <p className="truncate">{goal.name}</p>
                            {goal.description && (
                              <p className="text-xs text-neutral-400 truncate">{goal.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-neutral-700 tabular-nums text-center align-middle">${Number(goal.current_amount).toFixed(2)}</td>
                        <td className="px-3 py-2 text-neutral-700 tabular-nums text-center align-middle">${Number(goal.target_amount).toFixed(2)}</td>
                        <td className="px-3 py-2 text-neutral-700 tabular-nums text-center align-middle">${remaining.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center align-middle">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${goal.is_completed ? 'bg-success-bg text-success-text' : 'bg-brand-light text-brand-text'}`}>
                            {goal.progress_percent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-neutral-700 text-center align-middle whitespace-nowrap">{formatGoalDate(goal.target_date)}</td>
                        <td className={`px-3 py-2 text-center align-middle whitespace-nowrap ${getDaysRemainingClass(goal.days_remaining)}`}>
                          {goal.days_remaining} {t('planning.goal.days_left')}
                        </td>
                        <td className="px-3 py-2 text-center align-middle">
                          <TableActionGroup>
                            <EditButton onClick={() => handleEditGoal(goal)} label={t('planning.goal.edit')} />
                            <DeleteButton onClick={() => handleDeleteGoal(goal)} label={t('planning.goal.delete')} />
                          </TableActionGroup>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
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
                  ? t('planning.goal.new')
                  : t('planning.goal.edit')}
              </h2>
                <p className="mt-0.5 text-sm text-neutral-700">
                  {formMode === 'create'
                    ? t('planning.goal.create_desc')
                    : t('planning.goal.edit_desc')}
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

              <FormField label={t('planning.goal.bank')}>
                <Select
                  value={formData.bank_id}
                  onChange={(value) => {
                    setFormData({ ...formData, bank_id: value, pocket_id: '' })
                  }}
                  options={[
                    { value: '', label: t('planning.goal.select_bank') },
                    ...((banks || []).map((bank) => ({
                      value: String(bank.id),
                      label: bank.name,
                    }))),
                  ]}
                  className="w-full"
                  active={Boolean(formData.bank_id)}
                />
              </FormField>

              <FormField label={t('planning.goal.pocket')}>
                <Select
                  value={formData.pocket_id}
                  onChange={(value) => setFormData({ ...formData, pocket_id: value })}
                  options={[
                    { value: '', label: t('planning.goal.no_pocket_manual') },
                    ...((filteredPockets || []).map((pocket) => ({
                      value: String(pocket.id),
                      label: `${pocket.name} ($${Number(pocket.balance).toFixed(2)})`,
                    }))),
                  ]}
                  disabled={!formData.bank_id}
                  className="w-full"
                  active={Boolean(formData.pocket_id)}
                />
              </FormField>

              {formMode === 'edit' && !formData.pocket_id && (
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

              {formMode === 'edit' && formData.pocket_id && (
                <p className="app-subtitle text-xs">
                  {t('planning.goal.saved_auto_from_pocket')}
                </p>
              )}

              <DatePicker
                label={t('planning.goal.target_date')}
                value={formData.target_date}
                onChange={(value) => setFormData({ ...formData, target_date: value })}
                className="w-full"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  disabled={createGoal.isPending || updateGoal.isPending}
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

