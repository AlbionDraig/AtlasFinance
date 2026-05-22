import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { metricsApi } from '@/api/metrics'
import { useToast } from '@/hooks/useToast'
import type { SmartAlertsSummary } from '@/types'

interface SmartAlertsParams {
  lookbackDays?: number
  reminderWindowDays?: number
}

interface SmartAlertsResult {
  data: SmartAlertsSummary | null
  loading: boolean
}

/**
 * Hook to fetch smart alerts and subscriptions intelligence summary.
 */
export function useSmartAlertsData({ lookbackDays = 90, reminderWindowDays = 7 }: SmartAlertsParams = {}): SmartAlertsResult {
  const { t } = useTranslation()
  const { toast } = useToast()

  const query = useQuery<SmartAlertsSummary>({
    queryKey: ['smart-alerts', lookbackDays, reminderWindowDays],
    queryFn: async () => {
      const response = await metricsApi.smartAlerts({
        lookback_days: lookbackDays,
        reminder_window_days: reminderWindowDays,
      })
      return response.data
    },
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 401) return false
      return failureCount < 2
    },
  })

  useEffect(() => {
    if (!query.isError) return
    const status = (query.error as { response?: { status?: number } })?.response?.status
    if (status === 401) return
    toast(t('planning.alerts.error_load'), 'error')
  }, [query.isError])

  return {
    data: query.data ?? null,
    loading: query.isLoading || query.isFetching,
  }
}
