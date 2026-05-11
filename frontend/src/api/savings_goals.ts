import apiClient from '@/lib/axios'

type Decimal = number

// Savings goal creation payload.
export interface SavingsGoalCreatePayload {
  name: string
  description?: string
  target_amount: number
  target_date: string // ISO 8601 date string
}

// Savings goal update payload.
export interface SavingsGoalUpdatePayload {
  name?: string
  description?: string
  target_amount?: number
  current_amount?: number
  target_date?: string
}

// Savings goal read response with progress info.
export interface SavingsGoalRead {
  id: number
  name: string
  description: string | null
  target_amount: Decimal
  current_amount: Decimal
  target_date: string // ISO 8601 date string
  progress_percent: number
  days_remaining: number
  is_completed: boolean
}

// Scenario simulation request payload.
export interface ScenarioSimulationRequest {
  category_id: number
  reduction_percent: number // 0-100
  months_ahead: number
}

// Scenario simulation response.
export interface ScenarioSimulationResponse {
  goal_id: number
  goal_name: string
  current_amount: Decimal
  projected_amount: Decimal
  target_amount: Decimal
  projected_progress_percent: number
  will_reach_target: boolean
  days_to_target: number | null
}

// Centralized savings goals endpoints.
export const savingsGoalsApi = {
  list: () =>
    apiClient.get<SavingsGoalRead[]>('/savings-goals'),
  get: (id: number) =>
    apiClient.get<SavingsGoalRead>(`/savings-goals/${id}`),
  create: (data: SavingsGoalCreatePayload) =>
    apiClient.post<SavingsGoalRead>('/savings-goals', data),
  update: (id: number, data: SavingsGoalUpdatePayload) =>
    apiClient.put<SavingsGoalRead>(`/savings-goals/${id}`, data),
  delete: (id: number) =>
    apiClient.delete(`/savings-goals/${id}`),
  simulateScenario: (data: ScenarioSimulationRequest) =>
    apiClient.post<ScenarioSimulationResponse[]>('/savings-goals/simulate/scenario', data),
}
