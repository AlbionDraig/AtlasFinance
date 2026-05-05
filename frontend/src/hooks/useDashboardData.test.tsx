import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ToastProvider } from '@/hooks/useToast'

const dashboardMock = vi.fn()
const aggregatesMock = vi.fn()

vi.mock('@/api/metrics', () => ({
  metricsApi: {
    dashboard: (...args: unknown[]) => dashboardMock(...args),
    aggregates: (...args: unknown[]) => aggregatesMock(...args),
  },
}))

import { useDashboardData } from './useDashboardData'

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

const baseParams = {
  currency: 'COP',
  dateFrom: new Date('2026-01-01'),
  dateTo: new Date('2026-01-31'),
  prevFrom: new Date('2025-12-01'),
  prevTo: new Date('2025-12-31'),
}

describe('useDashboardData', () => {
  beforeEach(() => {
    dashboardMock.mockReset()
    aggregatesMock.mockReset()
  })

  it('fetches metrics and aggregates and exposes them once loaded', async () => {
    const metrics = { net_worth: 1000 }
    const aggregates = { totals: { income: 500 } }
    dashboardMock.mockResolvedValue({ data: metrics })
    aggregatesMock.mockResolvedValue({ data: aggregates })

    const { result } = renderHook(() => useDashboardData(baseParams), { wrapper })

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.metrics).toEqual(metrics)
    expect(result.current.aggregates).toEqual(aggregates)
    expect(dashboardMock).toHaveBeenCalledWith('COP')
    expect(aggregatesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'COP',
        start_date: '2026-01-01T00:00:00',
        end_date: '2026-01-31T23:59:59',
      }),
    )
  })

  it('keeps metrics null and turns loading off when the API rejects', async () => {
    dashboardMock.mockRejectedValue(new Error('boom'))
    aggregatesMock.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useDashboardData(baseParams), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.metrics).toBeNull()
    expect(result.current.aggregates).toBeNull()
  })
})
