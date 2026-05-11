import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { metricsApi } from '@/api/metrics'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import { useToast } from '@/hooks/useToast'
import type { DashboardAggregates, DashboardMetrics } from '@/types'

/**
 * Convierte un Date a string ISO de fecha (YYYY-MM-DD).
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

interface DashboardQueryData {
  metrics: DashboardMetrics
  aggregates: DashboardAggregates
}

/**
 * Hook de datos del dashboard migrado a React Query.
 *
 * La query key incluye los timestamps de los rangos para que React Query
 * distinga cada combinación sin comparar instancias de Date (que cambian
 * en cada render del padre aunque representen el mismo momento).
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

  const query = useQuery<DashboardQueryData>({
    queryKey: [
      ...QUERY_KEYS.dashboard,
      currency,
      dateFrom.getTime(),
      dateTo.getTime(),
      prevFrom.getTime(),
      prevTo.getTime(),
    ],
    queryFn: async () => {
      const dfStr = `${toISODate(dateFrom)}T00:00:00`
      const dtStr = `${toISODate(dateTo)}T23:59:59`
      const pfStr = `${toISODate(prevFrom)}T00:00:00`
      const ptStr = `${toISODate(prevTo)}T23:59:59`
      const [m, agg] = await Promise.all([
        metricsApi.dashboard(currency),
        metricsApi.aggregates({
          currency,
          start_date: dfStr,
          end_date: dtStr,
          prev_start_date: pfStr,
          prev_end_date: ptStr,
        }),
      ])
      return { metrics: m.data, aggregates: agg.data }
    },
    // No staleTime: the dashboard always needs fresh data per selected range.
    retry: (failureCount, error) => {
      // No reintentar en 401 — el interceptor de axios ya redirige.
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 401) return false
      return failureCount < 2
    },
  })

  useEffect(() => {
    if (!query.isError) return
    const status = (query.error as { response?: { status?: number } })?.response?.status
    if (status === 401) return
    toast(t('dashboard.error_load'), 'error')
  }, [query.isError])  // eslint-disable-line react-hooks/exhaustive-deps

  return {
    metrics: query.data?.metrics ?? null,
    aggregates: query.data?.aggregates ?? null,
    loading: query.isLoading || query.isFetching,
  }
}
