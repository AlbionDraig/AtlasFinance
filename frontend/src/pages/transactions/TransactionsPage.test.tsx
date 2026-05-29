import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/hooks/useToast'
import TransactionsPage from './TransactionsPage'

const exportMock = vi.fn()
const downloadBlobFileMock = vi.fn()

vi.mock('@/api/transactions', () => ({
  transactionsApi: {
    export: (...args: unknown[]) => exportMock(...args),
  },
}))

vi.mock('@/lib/download', () => ({
  downloadBlobFile: (...args: unknown[]) => downloadBlobFileMock(...args),
}))

vi.mock('@/hooks/useTransactionsData', () => ({
  useTransactionsCatalogs: () => ({
    accounts: [{ id: 7, name: 'Main account', currency: 'COP', bank_id: 1, account_type: 'checking', balance: 0 }],
    categories: [{ id: 1, name: 'Food', description: '', is_fixed: false, category_type: 'expense' }],
    pockets: [{ id: 1, name: 'Pocket' }],
    loading: false,
  }),
  useTransactionsList: () => ({
    transactions: [{ id: 99, amount: 125, transaction_type: 'EXPENSE' }],
    total: 1,
    loading: false,
  }),
}))

vi.mock('./hooks/useTransactionsFilters', () => ({
  useTransactionsFilters: () => ({
    filters: {
      query: '',
      transactionType: 'EXPENSE',
      currency: 'COP',
      accountId: '7',
      period: 'custom',
      from: '2026-05-01',
      to: '2026-05-20',
      pageSize: 25,
    },
    setFilters: vi.fn(),
    page: 1,
    setPage: vi.fn(),
    transactionParams: {},
    transactionParamsKey: 'filters=1',
    derivedRange: { from: '2026-05-01', to: '2026-05-20' },
    activeFilters: [],
    handleRemoveFilter: vi.fn(),
    resetFilters: vi.fn(),
  }),
}))

vi.mock('./hooks/useTransactionForm', () => ({
  useTransactionForm: () => ({
    form: {
      description: '',
      amount: '',
      accountId: '',
      categoryId: 'none',
      transactionType: '',
      occurredDate: '',
      occurredTime: '',
    },
    setForm: vi.fn(),
    formErrors: {},
    setFormErrors: vi.fn(),
    editingId: null,
    modalOpen: false,
    transferOpen: false,
    moveToPocketOpen: false,
    setTransferOpen: vi.fn(),
    setMoveToPocketOpen: vi.fn(),
    selectedAccount: { id: 7, currency: 'COP' },
    accountCurrency: 'COP',
    categoryOptions: [],
    resetForm: vi.fn(),
    openCreateModal: vi.fn(),
    prepareEdit: vi.fn(),
    validate: vi.fn().mockReturnValue({}),
  }),
}))

vi.mock('./components/TransactionsFiltersCard', () => ({
  default: () => <div data-testid="transactions-filters-card" />,
}))

vi.mock('./components/TransactionsHistoryCard', () => ({
  default: () => <div data-testid="transactions-history-card" />,
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TransactionsPage />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('TransactionsPage integration', () => {
  beforeEach(() => {
    exportMock.mockReset()
    downloadBlobFileMock.mockReset()
    exportMock.mockResolvedValue({ data: 'id,amount\n99,125' })
  })

  it('renders the page shell and transaction sections', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByTestId('transactions-filters-card')).toBeInTheDocument()
    expect(screen.getByTestId('transactions-history-card')).toBeInTheDocument()
  })

  it('exports CSV when the export action is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /csv/i }))

    await waitFor(() => {
      expect(exportMock).toHaveBeenCalledWith({
        start_date: '2026-05-01T00:00:00',
        end_date: '2026-05-20T23:59:59',
        account_id: 7,
        transaction_type: 'expense',
        currency: 'COP',
      })
    })
    expect(downloadBlobFileMock).toHaveBeenCalledWith(expect.any(Blob), 'transactions.csv')
  })
})