import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { metricsApi } from '@/api/metrics'
import { useToast } from '@/hooks/useToast'
import type { DashboardAggregates, DashboardMetrics } from '@/types'

/**
 * Convierte un Date a string ISO de fecha (YYYY-MM-DD).
 *
 * Se usa para construir los rangos que la API consume en formato datetime.
 */
function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Parámetros de entrada del hook: rango actual y rango previo para deltas. */
interface DashboardDataParams {
  currency: string
  dateFrom: Date
  dateTo: Date
  prevFrom: Date
  prevTo: Date
}

/** Resultado expuesto al componente: datos crudos + estado de carga. */
interface DashboardDataResult {
  metrics: DashboardMetrics | null
  aggregates: DashboardAggregates | null
  loading: boolean
}

/**
 * Hook de datos del dashboard.
 *
 * Encapsula el fetching combinado de `metrics` (snapshot global) y
 * `aggregates` (rango con comparativo). Mantener esto fuera del componente
 * permite testear la página sin red y mejora SRP: la página solo consume
 * datos derivados; este hook solo orquesta API + toasts de error.
 *
 * Se reejecuta cuando cambia la moneda o los timestamps de los rangos para
 * evitar refetch innecesarios cuando React recrea instancias de Date con el
 * mismo valor temporal.
 */
export function useDashboardData({
  currency,
  dateFrom,
  dateTo,
  prevFrom,
  prevTo,
}: DashboardDataParams): DashboardDataResult {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [aggregates, setAggregates] = useState<DashboardAggregates | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const dfStr = `${toISODate(dateFrom)}T00:00:00`
    const dtStr = `${toISODate(dateTo)}T23:59:59`
    const pfStr = `${toISODate(prevFrom)}T00:00:00`
    const ptStr = `${toISODate(prevTo)}T23:59:59`
    Promise.all([
      metricsApi.dashboard(currency),
      metricsApi.aggregates({
        currency,
        start_date: dfStr,
        end_date: dtStr,
        prev_start_date: pfStr,
        prev_end_date: ptStr,
      }),
    ])
      .then(([m, agg]) => {
        setMetrics(m.data)
        setAggregates(agg.data)
      })
      .catch(() => toast(t('dashboard.error_load'), 'error'))
      .finally(() => setLoading(false))
    // Comparamos por timestamp porque las fechas se recalculan en cada render
    // del padre y dispararían fetches duplicados al cambiar la referencia.
  }, [currency, dateFrom.getTime(), dateTo.getTime(), prevFrom.getTime(), prevTo.getTime()])

  return { metrics, aggregates, loading }
}
