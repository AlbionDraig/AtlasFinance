import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { investmentsApi } from '@/api/investments'
import { investmentEntitiesApi } from '@/api/investmentEntities'
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
  const [investments, setInvestments] = useState<Investment[]>([])
  const [entities, setEntities] = useState<InvestmentEntity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([investmentsApi.list(), investmentEntitiesApi.list()])
      .then(([invRes, entityRes]) => {
        setInvestments(invRes.data)
        setEntities(entityRes.data)
      })
      .catch(() => toast(t('investments.toast_load_error'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  return { investments, setInvestments, entities, loading }
}
