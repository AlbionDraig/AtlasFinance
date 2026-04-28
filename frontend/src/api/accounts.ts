import apiClient from '@/lib/axios'
import type { Account } from '@/types'

export interface AccountCreatePayload {
  name: string
  account_type: 'savings' | 'checking'
  currency: 'COP' | 'USD'
  current_balance: number
  bank_id: number
}

export interface AccountFilters {
  search?: string
  account_type?: 'savings' | 'checking'
  currency?: 'COP' | 'USD'
  bank_id?: number
}

export const accountsApi = {
  list: (params?: AccountFilters) =>
    apiClient.get<Account[]>('/accounts', { params }),
  get: (id: number) => apiClient.get<Account>(`/accounts/${id}`),
  create: (data: AccountCreatePayload) =>
    apiClient.post<Account>('/accounts', data),
  update: (id: number, data: Partial<Account>) =>
    apiClient.put<Account>(`/accounts/${id}`, data),
  delete: (id: number) => apiClient.delete(`/accounts/${id}`),
}
