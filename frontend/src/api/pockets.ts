import apiClient from '@/lib/axios'
import type { Pocket } from '@/types'

export const pocketsApi = {
  list: () => apiClient.get<Pocket[]>('/pockets'),
  get: (id: number) => apiClient.get<Pocket>(`/pockets/${id}`),
  create: (data: Omit<Pocket, 'id'>) => apiClient.post<Pocket>('/pockets', data),
  update: (id: number, data: Partial<Pocket>) =>
    apiClient.put<Pocket>(`/pockets/${id}`, data),
  delete: (id: number) => apiClient.delete(`/pockets/${id}`),
}
