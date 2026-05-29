import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransactionsActions } from './useTransactionsActions'

const exportMock = vi.fn()
const createMock = vi.fn()
const updateMock = vi.fn()
const deleteMock = vi.fn()
const transferMock = vi.fn()
const moveFundsMock = vi.fn()
const downloadBlobFileMock = vi.fn()
const invalidateQueryKeysMock = vi.fn()

vi.mock('@/api/transactions', () => ({
  transactionsApi: {
    export: (...args: unknown[]) => exportMock(...args),
    create: (...args: unknown[]) => createMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
    transfer: (...args: unknown[]) => transferMock(...args),
  },
}))

vi.mock('@/api/pockets', () => ({
  pocketsApi: {
    moveFunds: (...args: unknown[]) => moveFundsMock(...args),
  },
}))

vi.mock('@/lib/download', () => ({
  downloadBlobFile: (...args: unknown[]) => downloadBlobFileMock(...args),
}))

vi.mock('@/lib/reactQuery', () => ({
  invalidateQueryKeys: (...args: unknown[]) => invalidateQueryKeysMock(...args),
}))

describe('useTransactionsActions', () => {
  beforeEach(() => {
    exportMock.mockReset()
    createMock.mockReset()
    updateMock.mockReset()
    deleteMock.mockReset()
    transferMock.mockReset()
    moveFundsMock.mockReset()
    downloadBlobFileMock.mockReset()
    invalidateQueryKeysMock.mockReset()
  })

  function buildParams(overrides?: Partial<Parameters<typeof useTransactionsActions>[0]>) {
    const toast = vi.fn()

    return {
      transactions: [{ id: 10 }] as never,
      filters: {
        query: '',
        transactionType: 'INCOME' as const,
        currency: 'USD' as const,
        accountId: '2',
        period: 'custom' as const,
        from: '2026-05-01',
        to: '2026-05-10',
        pageSize: 25,
      },
      derivedRange: { from: '2026-05-01', to: '2026-05-10' },
      queryClient: {} as never,
      form: {
        description: 'Salary',
        amount: '1200',
        accountId: '2',
        categoryId: 'none',
        transactionType: 'INCOME' as const,
        occurredDate: '2026-05-10',
        occurredTime: '08:30',
      },
      selectedAccount: { id: 2, currency: 'USD' } as never,
      editingId: null,
      validate: vi.fn().mockReturnValue({}),
      setFormErrors: vi.fn(),
      resetForm: vi.fn(),
      setTransferOpen: vi.fn(),
      setMoveToPocketOpen: vi.fn(),
      toast,
      t: (key: string) => key,
      ...overrides,
    }
  }

  it('exports csv using current filters and downloads the response blob', async () => {
    exportMock.mockResolvedValue({ data: 'id,amount\n1,10' })
    const params = buildParams()
    const { result } = renderHook(() => useTransactionsActions(params))

    await act(async () => {
      await result.current.handleExportCSV()
    })

    expect(exportMock).toHaveBeenCalledWith({
      start_date: '2026-05-01T00:00:00',
      end_date: '2026-05-10T23:59:59',
      account_id: 2,
      transaction_type: 'income',
      currency: 'USD',
    })
    expect(downloadBlobFileMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobFileMock).toHaveBeenCalledWith(expect.any(Blob), 'transactions.csv')
  })

  it('stops submit when validation errors exist and shows the first error toast', async () => {
    const validate = vi.fn().mockReturnValue({ amount: 'transactions.toast_amount_zero' })
    const setFormErrors = vi.fn()
    const toast = vi.fn()
    const params = buildParams({ validate, setFormErrors, toast })
    const { result } = renderHook(() => useTransactionsActions(params))

    const preventDefault = vi.fn()
    await act(async () => {
      await result.current.handleSubmit({ preventDefault } as never)
    })

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(setFormErrors).toHaveBeenCalledWith({ amount: 'transactions.toast_amount_zero' })
    expect(toast).toHaveBeenCalledWith('transactions.toast_amount_zero', 'error')
    expect(createMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })
})