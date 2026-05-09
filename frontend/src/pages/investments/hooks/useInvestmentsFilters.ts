import { useMemo, useState } from 'react'
import { INSTRUMENT_TYPES } from '@/api/investments'
import type { Investment, InvestmentEntity } from '@/types'

interface UseInvestmentsFiltersParams {
  investments: Investment[]
  entities: InvestmentEntity[]
  t: (key: string, params?: Record<string, unknown>) => string
}

export function useInvestmentsFilters({ investments, entities, t }: UseInvestmentsFiltersParams) {
  const [filterQuery, setFilterQuery] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCurrency, setFilterCurrency] = useState('')
  const [sortBy, setSortBy] = useState('')

  const entityById = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities])

  const filtered = useMemo(() => {
    const base = investments.filter((investment) => {
      if (filterQuery) {
        const query = filterQuery.toLowerCase()
        const entity = entityById.get(investment.investment_entity_id)
        if (!investment.name.toLowerCase().includes(query) && !(entity?.name ?? '').toLowerCase().includes(query)) {
          return false
        }
      }

      if (filterEntity && String(investment.investment_entity_id) !== filterEntity) return false
      if (filterType && investment.instrument_type !== filterType) return false
      if (filterCurrency && investment.currency !== filterCurrency) return false

      return true
    })

    if (!sortBy) return base

    return [...base].sort((a, b) => {
      const gainPctA = a.amount_invested > 0 ? (a.current_value - a.amount_invested) / a.amount_invested : 0
      const gainPctB = b.amount_invested > 0 ? (b.current_value - b.amount_invested) / b.amount_invested : 0
      switch (sortBy) {
        case 'gain_desc':
          return gainPctB - gainPctA
        case 'gain_asc':
          return gainPctA - gainPctB
        case 'invested_desc':
          return b.amount_invested - a.amount_invested
        case 'date_desc':
          return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        case 'date_asc':
          return new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
        case 'name_asc':
          return a.name.localeCompare(b.name, 'es')
        default:
          return 0
      }
    })
  }, [investments, filterQuery, filterEntity, filterType, filterCurrency, sortBy, entityById])

  const sortOptions = [
    { value: '', label: t('investments.sort_none') },
    { value: 'gain_desc', label: t('investments.sort_gain_desc') },
    { value: 'gain_asc', label: t('investments.sort_gain_asc') },
    { value: 'invested_desc', label: t('investments.sort_invested_desc') },
    { value: 'date_desc', label: t('investments.sort_date_desc') },
    { value: 'date_asc', label: t('investments.sort_date_asc') },
    { value: 'name_asc', label: t('investments.sort_name_asc') },
  ]

  const selectedSortLabel = sortBy
    ? (sortOptions.find((option) => option.value === sortBy)?.label ?? '')
    : ''

  const hasFilters = !!(filterQuery || filterEntity || filterType || filterCurrency || sortBy)

  const activeFilters = [
    filterQuery && t('investments.chip_search', { value: `"${filterQuery}"` }),
    filterEntity && t('investments.chip_entity', { value: entityById.get(Number(filterEntity))?.name ?? '' }),
    filterType && t('investments.chip_type', { value: filterType }),
    filterCurrency && t('investments.chip_currency', { value: filterCurrency }),
    selectedSortLabel && t('investments.chip_sort', { value: selectedSortLabel }),
  ].filter(Boolean) as string[]

  const totalInvested = useMemo(() => filtered.reduce((sum, investment) => sum + investment.amount_invested, 0), [filtered])
  const totalCurrent = useMemo(() => filtered.reduce((sum, investment) => sum + investment.current_value, 0), [filtered])

  const entityFilterOptions = [
    { value: '', label: t('investments.filter_entity_all') },
    ...entities.map((entity) => ({ value: String(entity.id), label: entity.name })),
  ]

  const typeFilterOptions = [
    { value: '', label: t('investments.filter_type_all') },
    ...INSTRUMENT_TYPES.map((type) => ({ value: type, label: type })),
  ]

  const currencyFilterOptions = [
    { value: '', label: t('investments.filter_currency_all') },
    { value: 'COP', label: 'COP' },
    { value: 'USD', label: 'USD' },
  ]

  function clearFilters() {
    setFilterQuery('')
    setFilterEntity('')
    setFilterType('')
    setFilterCurrency('')
    setSortBy('')
  }

  return {
    filterQuery,
    setFilterQuery,
    filterEntity,
    setFilterEntity,
    filterType,
    setFilterType,
    filterCurrency,
    setFilterCurrency,
    sortBy,
    setSortBy,
    entityById,
    filtered,
    hasFilters,
    activeFilters,
    totalInvested,
    totalCurrent,
    sortOptions,
    selectedSortLabel,
    entityFilterOptions,
    typeFilterOptions,
    currencyFilterOptions,
    clearFilters,
  }
}
