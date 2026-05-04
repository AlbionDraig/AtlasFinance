import apiClient from '@/lib/axios'
import type { Pocket, Transaction } from '@/types'

// Payload used to create pockets linked to an account.
export interface PocketPayload {
  name: string
  balance: number
  currency: 'COP' | 'USD'
  account_id: number
}

export interface PocketUpdatePayload {
  name: string
  account_id: number
}

export interface PocketMovePayload {
  amount: number
  account_id: number
  pocket_id: number
  occurred_at: string
}

export interface PocketWithdrawPayload {
  amount: number
  pocket_id: number
  occurred_at: string
}

// Endpoint wrapper for pockets operations and move-funds transaction.
export const pocketsApi = {
  list: () => apiClient.get<Pocket[]>('/pockets'),
  get: (id: number) => apiClient.get<Pocket>(`/pockets/${id}`),
  create: (data: PocketPayload) => apiClient.post<Pocket>('/pockets', data),
  update: (id: number, data: PocketUpdatePayload) =>
    apiClient.put<Pocket>(`/pockets/${id}`, data),
  moveFunds: (data: PocketMovePayload) =>
    apiClient.post<Transaction>('/pockets/move-funds', data),
  withdraw: (data: PocketWithdrawPayload) =>
    apiClient.post<Transaction>('/pockets/withdraw', data),
  delete: (id: number) => apiClient.delete(`/pockets/${id}`),
}
