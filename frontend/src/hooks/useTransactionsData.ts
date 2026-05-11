import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { accountsApi } from '@/api/accounts'
import { categoriesApi } from '@/api/categories'
import { pocketsApi } from '@/api/pockets'
import { transactionsApi, type TransactionFilters } from '@/api/transactions'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import type { Account, Category, Pocket, Transaction } from '@/types'

/**
 * Catálogos compartidos por la página de transacciones (accounts, categories, pockets).
 *
 * Cada catálogo es una query independiente; si pockets falla la página sigue siendo
 * utilizable porque su queryFn absorbe el error y retorna [].
 * React Query deduplica las peticiones cuando otros hooks ya cargaron el mismo key.
 */
export interface TransactionsCatalogs {
  accounts: Account[]
  categories: Category[]
  pockets: Pocket[]
  loading: boolean
}

export function useTransactionsCatalogs(): TransactionsCatalogs {
  const { t } = useTranslation()
  const { toast } = useToast()

  const accountsQuery = useQuery<Account[]>({
    queryKey: QUERY_KEYS.accounts,
    queryFn: async () => {
      const res = await accountsApi.list()
      return res.data
    },
  })

  const categoriesQuery = useQuery<Category[]>({
    queryKey: QUERY_KEYS.categories,
    queryFn: async () => {
      const res = await categoriesApi.list()
      return res.data
    },
    staleTime: 5 * 60_000,
  })

  const pocketsQuery = useQuery<Pocket[]>({
    queryKey: QUERY_KEYS.pockets,
    queryFn: async () => {
      try {
        const res = await pocketsApi.list()
        return res.data
      } catch {
        // Mantener la página utilizable si /pockets falla.
        return []
      }
    },
  })

  useEffect(() => {
    if (accountsQuery.isError || categoriesQuery.isError) {
      toast(
        getApiErrorMessage(
          accountsQuery.error ?? categoriesQuery.error,
          t('transactions.toast_load_error'),
        ),
        'error',
      )
    }
  }, [accountsQuery.isError, categoriesQuery.isError])

  return {
    accounts: accountsQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    pockets: pocketsQuery.data ?? [],
    loading: accountsQuery.isLoading || categoriesQuery.isLoading || pocketsQuery.isLoading,
  }
}

/**
 * Lista paginada de transacciones que se refetcha cuando cambia `paramsKey`.
 *
 * La clave incluye los params serializados para que React Query distinga
 * cada combinación de filtros de forma automática y sin refetches espurios.
 */
export interface TransactionsListResult {
  transactions: Transaction[]
  total: number
  loading: boolean
}

export function useTransactionsList(
  params: TransactionFilters,
  /**
   * Clave estable derivada de `params` (e.g. JSON.stringify).
   * Cambia sólo cuando el contenido cambia, no en cada re-render del padre.
   */
  paramsKey: string,
): TransactionsListResult {
  const { t } = useTranslation()
  const { toast } = useToast()

  const query = useQuery({
    queryKey: [...QUERY_KEYS.transactions, paramsKey],
    queryFn: async () => {
      const response = await transactionsApi.list(params)
      return response.data
    },
  })

  useEffect(() => {
    if (query.isError) {
      toast(getApiErrorMessage(query.error, t('transactions.toast_load_movements_error')), 'error')
    }
  }, [query.isError])

  return {
    transactions: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    loading: query.isLoading || query.isFetching,
  }
}
