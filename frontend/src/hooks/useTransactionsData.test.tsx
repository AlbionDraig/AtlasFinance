import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ToastProvider } from '@/hooks/useToast'

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

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
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
})

describe('useTransactionsList', () => {
  beforeEach(() => {
    transactionsListMock.mockReset()
  })

  it('refetches when paramsKey changes and exposes total/items', async () => {
    transactionsListMock.mockResolvedValueOnce({ data: { items: [{ id: 1 }], total: 1 } })

    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useTransactionsList({ q: key }, key),
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

  it('reload() triggers a fresh fetch with current params', async () => {
    transactionsListMock.mockResolvedValue({ data: { items: [], total: 0 } })

    const { result } = renderHook(
      () => useTransactionsList({ page: 1 }, 'page=1'),
      { wrapper },
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(transactionsListMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.reload()
    })
    expect(transactionsListMock).toHaveBeenCalledTimes(2)
  })
})
