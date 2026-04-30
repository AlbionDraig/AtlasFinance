import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { accountsApi } from '@/api/accounts'
import type { Bank } from '@/api/banks'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import type { Account } from '@/types'
import type { AccountsFiltersState } from '@/pages/accounts/components/AccountsFiltersCard'
import { useBanksQuery } from '@/hooks/useCatalogQueries'

/**
 * Catálogo de bancos: delegado a React Query para caché automático.
 * Mantiene la misma interfaz `{ banks }` para no romper consumidores existentes.
 */
export function useBanks(): { banks: Bank[] } {
  const { data } = useBanksQuery()
  return { banks: data ?? [] }
}

interface AccountsListResult {
  accounts: Account[]
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>
  loading: boolean
}

/**
 * Lista de cuentas filtrada por servidor con debounce sobre la búsqueda libre.
 *
 * Expone `setAccounts` para que la página actualice la lista optimistamente
 * después de crear/editar/borrar sin disparar un refetch.
 *
 * `onAfterLoad` permite efectos secundarios (e.g. resetear paginación) en el
 * mismo render que repuebla la lista, evitando flashes intermedios.
 */
export function useAccountsList(
  filters: AccountsFiltersState,
  onAfterLoad?: () => void,
): AccountsListResult {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Debounce solo cuando hay texto: filtros estructurados aplican inmediato.
    const delayMs = filters.query.trim() ? 350 : 0

    const timer = setTimeout(() => {
      setLoading(true)
      accountsApi.list({
        search: filters.query.trim() || undefined,
        account_type: filters.accountType !== 'all' ? (filters.accountType as 'savings' | 'checking') : undefined,
        currency: filters.currency !== 'all' ? (filters.currency as 'COP' | 'USD') : undefined,
        bank_id: filters.bankId !== 'all' ? Number(filters.bankId) : undefined,
      })
        .then((res) => {
          if (cancelled) return
          setAccounts(res.data)
          onAfterLoad?.()
        })
        .catch((error) => {
          if (!cancelled) toast(getApiErrorMessage(error, t('accounts.toast_load_error')), 'error')
        })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, delayMs)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [filters.query, filters.accountType, filters.currency, filters.bankId])

  return { accounts, setAccounts, loading }
}
