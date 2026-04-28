import apiClient from '@/lib/axios'
import type { Pocket } from '@/types'

export interface PocketPayload {
  name: string
  balance: number
  currency: 'COP' | 'USD'
  account_id: number
}

export const pocketsApi = {
  list: () => apiClient.get<Pocket[]>('/pockets'),
  get: (id: number) => apiClient.get<Pocket>(`/pockets/${id}`),
  create: (data: PocketPayload) => apiClient.post<Pocket>('/pockets', data),
  update: (id: number, data: PocketPayload) =>
    apiClient.put<Pocket>(`/pockets/${id}`, data),
  delete: (id: number) => apiClient.delete(`/pockets/${id}`),
}
