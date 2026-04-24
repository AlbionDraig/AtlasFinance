export type TransactionType = 'INCOME' | 'EXPENSE'

export type PeriodFilter = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom'

export interface FormState {
  description: string
  amount: string
  accountId: string
  categoryId: string
  transactionType: TransactionType
  occurredDate: string
  occurredTime: string
}

export interface FiltersState {
  query: string
  transactionType: 'all' | TransactionType
  currency: 'all' | 'COP' | 'USD'
  accountId: string
  period: PeriodFilter
  from: string
  to: string
  pageSize: number
}
