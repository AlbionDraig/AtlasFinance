import apiClient from '@/lib/axios'
import type { Account } from '@/types'

export const accountsApi = {
  list: () => apiClient.get<Account[]>('/accounts'),
  get: (id: number) => apiClient.get<Account>(`/accounts/${id}`),
  create: (data: Omit<Account, 'id'>) =>
    apiClient.post<Account>('/accounts', data),
  update: (id: number, data: Partial<Account>) =>
    apiClient.put<Account>(`/accounts/${id}`, data),
  delete: (id: number) => apiClient.delete(`/accounts/${id}`),
}
