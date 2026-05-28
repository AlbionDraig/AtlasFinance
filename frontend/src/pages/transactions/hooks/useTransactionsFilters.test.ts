import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDefaultFilters, buildTransactionApiParams, filtersToSearchParams, resolvePeriodRange } from './useTransactionsFilters'

describe('transaction filter helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 28, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds default filters for the current 30-day window', () => {
    const filters = buildDefaultFilters()

    expect(filters).toMatchObject({
      query: '',
      transactionType: 'all',
      currency: 'all',
      accountId: 'all',
      period: 'all',
      from: '2026-04-29',
      to: '2026-05-28',
      pageSize: 25,
    })
  })

  it('serializes custom filters to query params without defaults', () => {
    const params = filtersToSearchParams({
      query: ' groceries ',
      transactionType: 'INCOME',
      currency: 'USD',
      accountId: '15',
      period: 'custom',
      from: '2026-05-01',
      to: '2026-05-10',
      pageSize: 50,
    })

    expect(params.toString()).toBe('q=groceries&type=INCOME&currency=USD&account=15&period=custom&from=2026-05-01&to=2026-05-10&pageSize=50')
  })

  it('resolves period ranges and transaction API params from filters', () => {
    expect(resolvePeriodRange('today', '2026-01-01', '2026-01-02')).toEqual({ from: '2026-05-28', to: '2026-05-28' })
    expect(resolvePeriodRange('7d', '2026-01-01', '2026-01-02')).toEqual({ from: '2026-05-22', to: '2026-05-28' })
    expect(resolvePeriodRange('month', '2026-01-01', '2026-01-02')).toEqual({ from: '2026-05-01', to: '2026-05-28' })

    expect(
      buildTransactionApiParams(
        {
          query: ' food ',
          transactionType: 'EXPENSE',
          currency: 'COP',
          accountId: '7',
          period: 'custom',
          from: '2026-05-10',
          to: '2026-05-12',
          pageSize: 20,
        },
        ' food ',
        3,
      ),
    ).toEqual({
      start_date: '2026-05-10T00:00:00',
      end_date: '2026-05-12T23:59:59',
      account_id: 7,
      transaction_type: 'expense',
      currency: 'COP',
      search: 'food',
      skip: 40,
      limit: 20,
    })
  })
})