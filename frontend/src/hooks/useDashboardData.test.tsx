import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/hooks/useToast'

const dashboardMock = vi.fn()
const aggregatesMock = vi.fn()

vi.mock('@/api/metrics', () => ({
  metricsApi: {
    dashboard: (...args: unknown[]) => dashboardMock(...args),
    aggregates: (...args: unknown[]) => aggregatesMock(...args),
  },
}))

import { useDashboardData } from './useDashboardData'

function ToastProbe() {
  const { toasts } = useToast()
  return <span data-testid="toast-messages">{toasts.map((toast) => toast.message).join(',')}</span>
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 1 },
    },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
        <ToastProbe />
      </ToastProvider>
    </QueryClientProvider>
  )
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
    const error401 = Object.assign(new Error('Unauthorized'), { response: { status: 401 } })
    dashboardMock.mockRejectedValue(error401)
    aggregatesMock.mockRejectedValue(error401)

    const { result } = renderHook(() => useDashboardData(baseParams), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 })
    expect(result.current.metrics).toBeNull()
    expect(result.current.aggregates).toBeNull()
  })

  it('shows an error toast when the API fails with a non-auth error', async () => {
    const genericError = new Error('Server exploded')
    dashboardMock.mockRejectedValue(genericError)
    aggregatesMock.mockRejectedValue(genericError)

    const { result } = renderHook(() => useDashboardData(baseParams), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    await waitFor(() => expect(screen.getByTestId('toast-messages').textContent).not.toBe(''))

    expect(result.current.metrics).toBeNull()
    expect(result.current.aggregates).toBeNull()
  })
})
