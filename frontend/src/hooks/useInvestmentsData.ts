import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { investmentsApi } from '@/api/investments'
import { investmentEntitiesApi } from '@/api/investmentEntities'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import { useToast } from '@/hooks/useToast'
import type { Investment, InvestmentEntity } from '@/types'

interface InvestmentsDataResult {
  investments: Investment[]
  setInvestments: React.Dispatch<React.SetStateAction<Investment[]>>
  entities: InvestmentEntity[]
  loading: boolean
}

/**
 * Carga inicial paralela de inversiones y entidades emisoras.
 *
 * Las dos colecciones se necesitan juntas para resolver nombres en la tabla.
 * Expone `setInvestments` para mutaciones optimistas tras CRUD.
 */
export function useInvestmentsData(): InvestmentsDataResult {
  const { t } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const investmentsQuery = useQuery<Investment[]>({
    queryKey: QUERY_KEYS.investments,
    queryFn: async () => {
      const response = await investmentsApi.list()
      return response.data
    },
  })

  const entitiesQuery = useQuery<InvestmentEntity[]>({
    queryKey: QUERY_KEYS.investmentEntities,
    queryFn: async () => {
      const response = await investmentEntitiesApi.list()
      return response.data
    },
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (investmentsQuery.isError || entitiesQuery.isError) {
      toast(t('investments.toast_load_error'), 'error')
    }
  }, [investmentsQuery.isError, entitiesQuery.isError, t, toast])

  function setInvestments(updater: React.SetStateAction<Investment[]>) {
    queryClient.setQueryData<Investment[]>(QUERY_KEYS.investments, (current) => {
      const previous = current ?? []
      return typeof updater === 'function'
        ? (updater as (prevState: Investment[]) => Investment[])(previous)
        : updater
    })
  }

  const loading = investmentsQuery.isLoading || entitiesQuery.isLoading
  const investments = investmentsQuery.data ?? []
  const entities = entitiesQuery.data ?? []

  return { investments, setInvestments, entities, loading }
}
