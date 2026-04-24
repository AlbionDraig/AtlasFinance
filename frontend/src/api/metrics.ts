import apiClient from '@/lib/axios'
import type { MetricSummary } from '@/types'

export const metricsApi = {
  summary: (params?: { start_date?: string; end_date?: string }) =>
    apiClient.get<MetricSummary>('/metrics/summary', { params }),
}
