import apiClient from '@/lib/axios'
import type { Transaction } from '@/types'

// Query contract supported by backend transactions listing endpoint.
export interface TransactionFilters {
  account_id?: number
  category_id?: number
  start_date?: string
  end_date?: string
  currency?: string
  transaction_type?: string
  search?: string
  skip?: number
  limit?: number
}

export interface TransferPayload {
  from_account_id: number
  to_account_id: number
  amount: number
  occurred_at: string
}

// Paginated response returned by GET /transactions.
export interface TransactionPage {
  items: Transaction[]
  total: number
  skip: number
  limit: number
}

// Thin API wrapper to centralize endpoint paths and response typing.
export const transactionsApi = {
  list: (params?: TransactionFilters) =>
    apiClient.get<TransactionPage>('/transactions', { params }),
  get: (id: number) => apiClient.get<Transaction>(`/transactions/${id}`),
  create: (data: Omit<Transaction, 'id'>) =>
    apiClient.post<Transaction>('/transactions', data),
  update: (id: number, data: Partial<Transaction>) =>
    apiClient.put<Transaction>(`/transactions/${id}`, data),
  delete: (id: number) => apiClient.delete(`/transactions/${id}`),
  transfer: (data: TransferPayload) =>
    apiClient.post<Transaction[]>('/transactions/transfer', data),
}
