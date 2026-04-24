import apiClient from '@/lib/axios'
import type { DashboardMetrics } from '@/types'

export const metricsApi = {
  dashboard: (currency = 'COP') =>
    apiClient.get<DashboardMetrics>('/metrics/dashboard', { params: { currency } }),
}
