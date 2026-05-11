import apiClient from '@/lib/axios'

type Decimal = number

// Budget creation payload.
export interface BudgetCreatePayload {
  category_id: number
  year: number
  month: number
  amount_limit: number
}

// Budget update payload.
export interface BudgetUpdatePayload {
  amount_limit: number
}

// Budget read response with spending info.
export interface BudgetRead {
  id: number
  category_id: number
  year: number
  month: number
  amount_limit: Decimal
  current_spent: Decimal
  remaining: Decimal
  status: 'ok' | 'warning' | 'exceeded'
}

// Monthly budgets list response.
export interface BudgetListResponse {
  year: number
  month: number
  budgets: BudgetRead[]
  total_limit: Decimal
  total_spent: Decimal
}

// Centralized budget endpoints.
export const budgetsApi = {
  listByMonth: (year: number, month: number) =>
    apiClient.get<BudgetListResponse>(`/budgets/${year}/${month}`),
  create: (data: BudgetCreatePayload) =>
    apiClient.post<BudgetRead>('/budgets', data),
  update: (id: number, data: BudgetUpdatePayload) =>
    apiClient.put<BudgetRead>(`/budgets/${id}`, data),
  delete: (id: number) => apiClient.delete(`/budgets/${id}`),
}
