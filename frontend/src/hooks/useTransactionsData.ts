import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { accountsApi } from '@/api/accounts'
import { categoriesApi } from '@/api/categories'
import { pocketsApi } from '@/api/pockets'
import { transactionsApi } from '@/api/transactions'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import type { Account, Category, Pocket, Transaction } from '@/types'

/**
 * Catálogos compartidos por la página de transacciones.
 *
 * `pockets` se aísla en su propio try/catch porque su endpoint puede no estar
 * disponible en backends antiguos; preferimos una página utilizable a un fallo total.
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
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [pockets, setPockets] = useState<Pocket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function bootstrap() {
      setLoading(true)
      try {
        const [accountsResponse, categoriesResponse] = await Promise.all([
          accountsApi.list(),
          categoriesApi.list(),
        ])
        setAccounts(accountsResponse.data)
        setCategories(categoriesResponse.data)

        try {
          const pocketsResponse = await pocketsApi.list()
          setPockets(pocketsResponse.data)
        } catch {
          // Mantener la página utilizable aún si /pockets falla.
          setPockets([])
        }
      } catch (loadError) {
        toast(getApiErrorMessage(loadError, t('transactions.toast_load_error')), 'error')
      } finally {
        setLoading(false)
      }
    }
    void bootstrap()
  }, [])

  return { accounts, categories, pockets, loading }
}

/**
 * Lista de transacciones recargada cuando cambian los parámetros del backend.
 *
 * Se separa del hook de catálogos porque tiene un ciclo de vida distinto:
 * la lista se refetcha al cambiar filtros, los catálogos solo una vez.
 */
export interface TransactionsListResult {
  transactions: Transaction[]
  total: number
  loading: boolean
  reload: () => Promise<void>
}

export function useTransactionsList(
  params: Record<string, unknown>,
  /**
   * Clave estable derivada de `params` para evitar refetches espurios cuando
   * el padre crea un objeto nuevo en cada render con el mismo contenido.
   */
  paramsKey: string,
): TransactionsListResult {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  async function reload() {
    setLoading(true)
    try {
      const response = await transactionsApi.list(params)
      setTransactions(response.data.items)
      setTotal(response.data.total)
    } catch (error) {
      toast(
        getApiErrorMessage(error, t('transactions.toast_load_movements_error')),
        'error',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [paramsKey])

  return { transactions, total, loading, reload }
}
