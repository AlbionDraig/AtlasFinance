import apiClient from '@/lib/axios'
import type { Transaction } from '@/types'

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

export const transactionsApi = {
  list: (params?: TransactionFilters) =>
    apiClient.get<Transaction[]>('/transactions', { params }),
  get: (id: number) => apiClient.get<Transaction>(`/transactions/${id}`),
  create: (data: Omit<Transaction, 'id'>) =>
    apiClient.post<Transaction>('/transactions', data),
  update: (id: number, data: Partial<Transaction>) =>
    apiClient.put<Transaction>(`/transactions/${id}`, data),
  delete: (id: number) => apiClient.delete(`/transactions/${id}`),
}
