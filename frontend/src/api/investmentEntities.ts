import apiClient from '@/lib/axios'

export type InvestmentEntityType = 'bank' | 'broker' | 'exchange' | 'fund_manager' | 'other'

// Investment entity resource used to classify where assets are held.
export interface InvestmentEntity {
  id: number
  name: string
  entity_type: InvestmentEntityType
  country_code: string
}

export interface InvestmentEntityPayload {
  name: string
  entity_type: InvestmentEntityType
  country_code: string
}

// UI labels for entity type selector.
export const INVESTMENT_ENTITY_TYPE_OPTIONS: Array<{ value: InvestmentEntityType; label: string }> = [
  { value: 'bank', label: 'Banco' },
  { value: 'broker', label: 'Broker' },
  { value: 'exchange', label: 'Exchange' },
  { value: 'fund_manager', label: 'Gestora de fondos' },
  { value: 'other', label: 'Otra' },
]

// CRUD wrapper for investment entities endpoints.
export const investmentEntitiesApi = {
  list: () => apiClient.get<InvestmentEntity[]>('/investment-entities'),
  create: (data: InvestmentEntityPayload) => apiClient.post<InvestmentEntity>('/investment-entities', data),
  update: (id: number, data: InvestmentEntityPayload) => apiClient.put<InvestmentEntity>(`/investment-entities/${id}`, data),
  delete: (id: number) => apiClient.delete(`/investment-entities/${id}`),
}
