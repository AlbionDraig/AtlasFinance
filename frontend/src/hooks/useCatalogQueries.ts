/**
 * Hooks de catálogo usando TanStack React Query.
 * Estos hooks son seguros para usarse en paralelo: React Query deduplica las
 * peticiones automáticamente cuando múltiples componentes consumen el mismo query key.
 */
import { useQuery } from '@tanstack/react-query'
import { accountsApi } from '@/api/accounts'
import { banksApi } from '@/api/banks'
import { categoriesApi } from '@/api/categories'
import { countriesApi } from '@/api/countries'
import { investmentEntitiesApi } from '@/api/investmentEntities'
import type { Bank } from '@/api/banks'
import type { Category } from '@/api/categories'
import type { Country } from '@/api/countries'
import type { InvestmentEntity } from '@/api/investmentEntities'
import type { Account } from '@/types'

// ─── Query keys ───────────────────────────────────────────────────────────────
// Centralizados para invalidar desde cualquier mutación sin hardcodear strings.
export const QUERY_KEYS = {
  accounts: ['accounts'] as const,
  banks: ['banks'] as const,
  categories: ['categories'] as const,
  countries: ['countries'] as const,
  investmentEntities: ['investmentEntities'] as const,
} as const

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAccountsQuery() {
  return useQuery<Account[]>({
    queryKey: QUERY_KEYS.accounts,
    queryFn: async () => {
      const res = await accountsApi.list()
      return res.data
    },
  })
}

export function useBanksQuery() {
  return useQuery<Bank[]>({
    queryKey: QUERY_KEYS.banks,
    queryFn: async () => {
      const res = await banksApi.list()
      return res.data
    },
    staleTime: 5 * 60_000, // bancos cambian raramente: 5 min stale
  })
}

export function useCategoriesQuery() {
  return useQuery<Category[]>({
    queryKey: QUERY_KEYS.categories,
    queryFn: async () => {
      const res = await categoriesApi.list()
      return res.data
    },
    staleTime: 5 * 60_000,
  })
}

export function useCountriesQuery() {
  return useQuery<Country[]>({
    queryKey: QUERY_KEYS.countries,
    queryFn: async () => {
      const res = await countriesApi.list()
      return res.data
    },
    staleTime: 60 * 60_000, // países no cambian: 1 h stale
  })
}

export function useInvestmentEntitiesQuery() {
  return useQuery<InvestmentEntity[]>({
    queryKey: QUERY_KEYS.investmentEntities,
    queryFn: async () => {
      const res = await investmentEntitiesApi.list()
      return res.data
    },
    staleTime: 5 * 60_000,
  })
}
