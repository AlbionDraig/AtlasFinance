import apiClient from '@/lib/axios'
import type { Investment } from '@/types'

export const INSTRUMENT_TYPES = ['Acciones', 'Fondos', 'Bonos', 'CDT', 'ETF', 'Cripto', 'Otro'] as const

export interface InvestmentPayload {
  name: string
  instrument_type: string
  amount_invested: number
  current_value: number
  currency: 'COP' | 'USD'
  investment_entity_id: number
  started_at: string
}

export interface InvestmentUpdatePayload {
  name: string
  instrument_type: string
  current_value: number
  investment_entity_id: number
  started_at: string
}

export const investmentsApi = {
  list: () => apiClient.get<Investment[]>('/investments'),
  get: (id: number) => apiClient.get<Investment>(`/investments/${id}`),
  create: (data: InvestmentPayload) => apiClient.post<Investment>('/investments', data),
  update: (id: number, data: InvestmentUpdatePayload) => apiClient.put<Investment>(`/investments/${id}`, data),
  delete: (id: number) => apiClient.delete(`/investments/${id}`),
}
