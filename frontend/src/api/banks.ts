import apiClient from '@/lib/axios'

// Backend bank resource shape used by list and CRUD screens.
export interface Bank {
  id: number
  name: string
  country_code: string
}

export interface BankCreatePayload {
  name: string
  country_code: string
}

// Thin wrapper that keeps endpoint paths and typing in one place.
export const banksApi = {
  list: () => apiClient.get<Bank[]>('/banks'),
  create: (data: BankCreatePayload) => apiClient.post<Bank>('/banks', data),
  update: (id: number, data: BankCreatePayload) => apiClient.put<Bank>(`/banks/${id}`, data),
  delete: (id: number) => apiClient.delete(`/banks/${id}`),
}
