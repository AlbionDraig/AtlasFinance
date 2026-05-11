import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '@/api/accounts'
import { banksApi, type Bank } from '@/api/banks'
import { pocketsApi } from '@/api/pockets'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import type { Account, Pocket } from '@/types'

interface PocketsDataResult {
  pockets: Pocket[]
  setPockets: React.Dispatch<React.SetStateAction<Pocket[]>>
  accounts: Account[]
  banks: Bank[]
  loading: boolean
}

/**
 * Carga inicial conjunta de pockets, cuentas y bancos.
 *
 * Se hace en paralelo (Promise.all) porque los tres son catálogos
 * estáticos relativos al render: la página los necesita todos antes
 * de renderizar la tabla. Expone `setPockets` para mutaciones
 * optimistas en CRUD.
 */
export function usePocketsData(): PocketsDataResult {
  const { t } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const pocketsQuery = useQuery<Pocket[]>({
    queryKey: QUERY_KEYS.pockets,
    queryFn: async () => {
      const response = await pocketsApi.list()
      return response.data
    },
  })

  const accountsQuery = useQuery<Account[]>({
    queryKey: QUERY_KEYS.accounts,
    queryFn: async () => {
      const response = await accountsApi.list()
      return response.data
    },
  })

  const banksQuery = useQuery<Bank[]>({
    queryKey: QUERY_KEYS.banks,
    queryFn: async () => {
      const response = await banksApi.list()
      return response.data
    },
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (pocketsQuery.isError || accountsQuery.isError || banksQuery.isError) {
      const candidate = pocketsQuery.error ?? accountsQuery.error ?? banksQuery.error
      toast(getApiErrorMessage(candidate, t('pockets.toast_load_error')), 'error')
    }
  }, [pocketsQuery.isError, accountsQuery.isError, banksQuery.isError, pocketsQuery.error, accountsQuery.error, banksQuery.error, toast, t])

  function setPockets(updater: React.SetStateAction<Pocket[]>) {
    queryClient.setQueryData<Pocket[]>(QUERY_KEYS.pockets, (current) => {
      const previous = current ?? []
      return typeof updater === 'function'
        ? (updater as (prevState: Pocket[]) => Pocket[])(previous)
        : updater
    })
  }

  const pockets = pocketsQuery.data ?? []
  const accounts = accountsQuery.data ?? []
  const banks = banksQuery.data ?? []
  const loading = pocketsQuery.isLoading || accountsQuery.isLoading || banksQuery.isLoading

  return { pockets, setPockets, accounts, banks, loading }
}
