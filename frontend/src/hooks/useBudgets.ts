import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { budgetsApi, type BudgetCreatePayload, type BudgetUpdatePayload } from '@/api/budgets'

const BUDGETS_QUERY_KEY = ['budgets']

/**
 * Hook to fetch budgets for a specific month.
 */
export function useBudgetsByMonth(year: number, month: number) {
  return useQuery({
    queryKey: [...BUDGETS_QUERY_KEY, year, month],
    queryFn: async () => {
      const response = await budgetsApi.listByMonth(year, month)
      return response.data
    },
  })
}

/**
 * Hook to create a new budget.
 */
export function useCreateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BudgetCreatePayload) =>
      budgetsApi.create(payload).then((response) => response.data),
    onSuccess: (_, variables) => {
      // Invalidate the monthly budgets query to refresh data
      queryClient.invalidateQueries({
        queryKey: [...BUDGETS_QUERY_KEY, variables.year, variables.month],
      })
    },
  })
}

/**
 * Hook to update a budget.
 */
export function useUpdateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BudgetUpdatePayload }) =>
      budgetsApi.update(id, payload).then((response) => response.data),
    onSuccess: () => {
      // Invalidate all budget queries since month/year are not part of update payload.
      queryClient.invalidateQueries({
        queryKey: BUDGETS_QUERY_KEY,
      })
    },
  })
}

/**
 * Hook to delete a budget.
 */
export function useDeleteBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      budgetsApi.delete(id),
    onSuccess: () => {
      // Invalidate all budgets queries
      queryClient.invalidateQueries({
        queryKey: BUDGETS_QUERY_KEY,
      })
    },
  })
}
