import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import ResponsiveFilters from '@/components/ui/ResponsiveFilters'
import SearchInput from '@/components/ui/SearchInput'
import Select from '@/components/ui/Select'

export type ProgressFilter = 'all' | 'early' | 'mid' | 'completed'
export type StatusFilter = 'all' | 'active' | 'completed' | 'overdue'

export interface SavingsGoalsFiltersState {
  query: string
  progress: ProgressFilter
  status: StatusFilter
  pocketId: string
}

export interface PocketOption {
  id: number
  name: string
}

interface SavingsGoalsFiltersCardProps {
  filters: SavingsGoalsFiltersState
  setFilters: Dispatch<SetStateAction<SavingsGoalsFiltersState>>
  pockets: PocketOption[]
  activeFilters: Array<{ id: string; label: string }>
  onResetFilters: () => void
  onRemoveFilter: (id: string) => void
}

export default function SavingsGoalsFiltersCard({
  filters,
  setFilters,
  pockets,
  activeFilters,
  onResetFilters,
  onRemoveFilter,
}: SavingsGoalsFiltersCardProps) {
  const { t } = useTranslation()

  return (
    <ResponsiveFilters
      activeFilters={activeFilters}
      onResetFilters={activeFilters.length > 0 ? onResetFilters : undefined}
      onRemoveFilter={onRemoveFilter}
      mobileTitle={t('planning.goals.title')}
      stickyDesktop={false}
    >
      {/* Búsqueda */}
      <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
        <label className="app-label">{t('common.search')}</label>
        <SearchInput
          value={filters.query}
          onChange={(value) => setFilters((current) => ({ ...current, query: value }))}
          placeholder={t('planning.goal.filter_search_placeholder')}
        />
      </div>

      {/* Estado */}
      <div className="flex flex-col gap-1 w-44">
        <label className="app-label">{t('planning.goal.filter_status_label')}</label>
        <Select
          value={filters.status}
          onChange={(value) => setFilters((current) => ({ ...current, status: value as StatusFilter }))}
          options={[
            { value: 'all', label: t('planning.goal.filter_status_all') },
            { value: 'active', label: t('planning.goal.filter_status_active') },
            { value: 'completed', label: t('planning.goal.filter_status_completed') },
            { value: 'overdue', label: t('planning.goal.filter_status_overdue') },
          ]}
          className="w-full"
          active={filters.status !== 'all'}
        />
      </div>

      {/* Progreso */}
      <div className="flex flex-col gap-1 w-48">
        <label className="app-label">{t('planning.goal.filter_progress_label')}</label>
        <Select
          value={filters.progress}
          onChange={(value) => setFilters((current) => ({ ...current, progress: value as ProgressFilter }))}
          options={[
            { value: 'all', label: t('planning.goal.filter_all') },
            { value: 'early', label: t('planning.goal.filter_early') },
            { value: 'mid', label: t('planning.goal.filter_mid') },
            { value: 'completed', label: t('planning.goal.filter_completed') },
          ]}
          className="w-full"
          active={filters.progress !== 'all'}
        />
      </div>

      {/* Bolsillo */}
      {pockets.length > 0 && (
        <div className="flex flex-col gap-1 w-48">
          <label className="app-label">{t('planning.goal.filter_pocket_label')}</label>
          <Select
            value={filters.pocketId}
            onChange={(value) => setFilters((current) => ({ ...current, pocketId: value }))}
            options={[
              { value: 'all', label: t('planning.goal.filter_pocket_all') },
              { value: 'none', label: t('planning.goal.filter_pocket_none') },
              ...pockets.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
            className="w-full"
            active={filters.pocketId !== 'all'}
          />
        </div>
      )}
    </ResponsiveFilters>
  )
}
