import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider, useToast } from '@/hooks/useToast'

const accountsListMock = vi.fn()
const categoriesListMock = vi.fn()
const pocketsListMock = vi.fn()
const transactionsListMock = vi.fn()

vi.mock('@/api/accounts', () => ({
  accountsApi: { list: (...a: unknown[]) => accountsListMock(...a) },
}))
vi.mock('@/api/categories', () => ({
  categoriesApi: { list: (...a: unknown[]) => categoriesListMock(...a) },
}))
vi.mock('@/api/pockets', () => ({
  pocketsApi: { list: (...a: unknown[]) => pocketsListMock(...a) },
}))
vi.mock('@/api/transactions', () => ({
  transactionsApi: { list: (...a: unknown[]) => transactionsListMock(...a) },
}))

import { useTransactionsCatalogs, useTransactionsList } from './useTransactionsData'

function ToastProbe() {
  const { toasts } = useToast()
  return <span data-testid="toast-messages">{toasts.map((toast) => toast.message).join(',')}</span>
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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

describe('useTransactionsCatalogs', () => {
  beforeEach(() => {
    accountsListMock.mockReset()
    categoriesListMock.mockReset()
    pocketsListMock.mockReset()
  })

  it('loads accounts, categories and pockets in parallel', async () => {
    accountsListMock.mockResolvedValue({ data: [{ id: 1 }] })
    categoriesListMock.mockResolvedValue({ data: [{ id: 2 }] })
    pocketsListMock.mockResolvedValue({ data: [{ id: 3 }] })

    const { result } = renderHook(() => useTransactionsCatalogs(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.accounts).toHaveLength(1)
    expect(result.current.categories).toHaveLength(1)
    expect(result.current.pockets).toHaveLength(1)
  })

  it('falls back to empty pockets when /pockets fails but keeps the rest usable', async () => {
    accountsListMock.mockResolvedValue({ data: [{ id: 1 }] })
    categoriesListMock.mockResolvedValue({ data: [{ id: 2 }] })
    pocketsListMock.mockRejectedValue(new Error('pockets endpoint missing'))

    const { result } = renderHook(() => useTransactionsCatalogs(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.accounts).toHaveLength(1)
    expect(result.current.pockets).toEqual([])
  })

  it('shows an error toast when accounts or categories fail', async () => {
    accountsListMock.mockRejectedValue(new Error('accounts failed'))
    categoriesListMock.mockResolvedValue({ data: [{ id: 2 }] })
    pocketsListMock.mockResolvedValue({ data: [{ id: 3 }] })

    const { result } = renderHook(() => useTransactionsCatalogs(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(screen.getByTestId('toast-messages').textContent).not.toBe(''))

    expect(result.current.accounts).toEqual([])
  })
})

describe('useTransactionsList', () => {
  beforeEach(() => {
    transactionsListMock.mockReset()
  })

  it('refetches when paramsKey changes and exposes total/items', async () => {
    transactionsListMock.mockResolvedValueOnce({ data: { items: [{ id: 1 }], total: 1 } })

    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useTransactionsList({ search: key }, key),
      { wrapper, initialProps: { key: 'a' } },
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.transactions).toHaveLength(1)
    expect(result.current.total).toBe(1)

    transactionsListMock.mockResolvedValueOnce({ data: { items: [{ id: 2 }, { id: 3 }], total: 2 } })
    rerender({ key: 'b' })

    await waitFor(() => expect(result.current.transactions).toHaveLength(2))
    expect(transactionsListMock).toHaveBeenCalledTimes(2)
  })

  it('returns empty state and handles errors gracefully', async () => {
    transactionsListMock.mockRejectedValue(new Error('API error'))

    const { result } = renderHook(
      () => useTransactionsList({ skip: 0, limit: 10 }, 'skip=0&limit=10'),
      { wrapper },
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.transactions).toEqual([])
    expect(result.current.total).toBe(0)
  })
})
