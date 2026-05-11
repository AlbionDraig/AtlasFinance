import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  savingsGoalsApi,
  type SavingsGoalCreatePayload,
  type SavingsGoalUpdatePayload,
  type ScenarioSimulationRequest,
} from '@/api/savings_goals'

const SAVINGS_GOALS_QUERY_KEY = ['savings-goals']

/**
 * Hook to fetch all savings goals.
 */
export function useSavingsGoals() {
  return useQuery({
    queryKey: SAVINGS_GOALS_QUERY_KEY,
    queryFn: async () => {
      const response = await savingsGoalsApi.list()
      return response.data
    },
  })
}

/**
 * Hook to fetch a specific savings goal.
 */
export function useSavingsGoal(id: number) {
  return useQuery({
    queryKey: [...SAVINGS_GOALS_QUERY_KEY, id],
    queryFn: async () => {
      const response = await savingsGoalsApi.get(id)
      return response.data
    },
  })
}

/**
 * Hook to create a new savings goal.
 */
export function useCreateSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SavingsGoalCreatePayload) =>
      savingsGoalsApi.create(payload).then((response) => response.data),
    onSuccess: () => {
      // Invalidate all savings goals queries
      queryClient.invalidateQueries({
        queryKey: SAVINGS_GOALS_QUERY_KEY,
      })
    },
  })
}

/**
 * Hook to update a savings goal.
 */
export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SavingsGoalUpdatePayload }) =>
      savingsGoalsApi.update(id, payload).then((response) => response.data),
    onSuccess: () => {
      // Invalidate all savings goals queries
      queryClient.invalidateQueries({
        queryKey: SAVINGS_GOALS_QUERY_KEY,
      })
    },
  })
}

/**
 * Hook to delete a savings goal.
 */
export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      savingsGoalsApi.delete(id),
    onSuccess: () => {
      // Invalidate all savings goals queries
      queryClient.invalidateQueries({
        queryKey: SAVINGS_GOALS_QUERY_KEY,
      })
    },
  })
}

/**
 * Hook to simulate scenario - project impact of spending reduction.
 */
export function useScenarioSimulation() {
  return useMutation({
    mutationFn: (payload: ScenarioSimulationRequest) =>
      savingsGoalsApi.simulateScenario(payload).then((response) => response.data),
  })
}
