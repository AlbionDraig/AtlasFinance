import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Transaction } from '@/types'
import TransactionsHistoryCard from './TransactionsHistoryCard'

function buildTransaction(): Transaction {
  return {
    id: 1,
    account_id: 10,
    amount: 25000,
    description: 'Compra supermercado',
    category_id: null,
    pocket_id: null,
    currency: 'COP',
    transaction_type: 'EXPENSE',
    occurred_at: '2026-05-10T14:30:00Z',
  }
}

function buildProps(overrides?: Partial<ComponentProps<typeof TransactionsHistoryCard>>): ComponentProps<typeof TransactionsHistoryCard> {
  const baseProps: ComponentProps<typeof TransactionsHistoryCard> = {
    filteredTransactions: [],
    paginatedTransactions: [],
    total: 0,
    loading: false,
    currentPage: 1,
    totalPages: 1,
    startIndex: 0,
    endIndex: 0,
    deletingId: null,
    accounts: [],
    categories: [],
    onPrevPage: vi.fn(),
    onNextPage: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    getCompactAccountName: vi.fn().mockReturnValue('Cuenta principal'),
    getCategoryName: vi.fn().mockReturnValue(''),
    formatCurrency: vi.fn().mockImplementation((value: number) => `$${value}`),
    normalizeTransactionType: vi.fn().mockReturnValue('EXPENSE'),
    pageSize: 10,
    onPageSizeChange: vi.fn(),
    incomeTotal: 0,
    expenseTotal: 0,
    currency: 'COP',
    onCreate: vi.fn(),
  }

  return {
    ...baseProps,
    ...overrides,
  }
}

describe('TransactionsHistoryCard', () => {
  it('shows loading skeleton when loading is true even if there are no rows', () => {
    render(<TransactionsHistoryCard {...buildProps({ loading: true })} />)

    expect(screen.getByLabelText('Cargando tabla…')).toBeInTheDocument()
    expect(screen.queryByText('No hay movimientos')).not.toBeInTheDocument()
  })

  it('shows empty state when loading is false and there are no rows', () => {
    render(<TransactionsHistoryCard {...buildProps({ loading: false })} />)

    expect(screen.getByText(/No hay movimientos|No transactions/i)).toBeInTheDocument()
  })

  it('shows transaction row when data exists and loading is false', () => {
    render(
      <TransactionsHistoryCard
        {...buildProps({
          total: 1,
          filteredTransactions: [buildTransaction()],
          paginatedTransactions: [buildTransaction()],
          endIndex: 1,
        })}
      />,
    )

    expect(screen.getAllByText('Compra supermercado').length).toBeGreaterThan(0)
  })
})
