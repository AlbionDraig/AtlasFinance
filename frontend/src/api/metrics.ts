import apiClient from '@/lib/axios'
import type { DashboardAggregates, DashboardMetrics } from '@/types'

export const metricsApi = {
  dashboard: (currency = 'COP') =>
    apiClient.get<DashboardMetrics>('/metrics/dashboard', { params: { currency } }),

  aggregates: (params: {
    currency: string
    start_date: string
    end_date: string
    prev_start_date: string
    prev_end_date: string
  }) => apiClient.get<DashboardAggregates>('/metrics/aggregates', { params }),
}
