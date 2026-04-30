import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { accountsApi } from '@/api/accounts'
import { banksApi, type Bank } from '@/api/banks'
import { pocketsApi } from '@/api/pockets'
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
  const [pockets, setPockets] = useState<Pocket[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [pocketsResponse, accountsResponse, banksResponse] = await Promise.all([
          pocketsApi.list(),
          accountsApi.list(),
          banksApi.list(),
        ])
        setPockets(pocketsResponse.data)
        setAccounts(accountsResponse.data)
        setBanks(banksResponse.data)
      } catch (error) {
        toast(getApiErrorMessage(error, t('pockets.toast_load_error')), 'error')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return { pockets, setPockets, accounts, banks, loading }
}
