import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, type UserRoleUpdateRequest } from '@/api/auth'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import type { User } from '@/types'

/** Fetch users for admin role management. */
export function useManagementUsersQuery(enabled: boolean) {
  return useQuery<User[]>({
    queryKey: QUERY_KEYS.managementUsers,
    queryFn: async () => {
      const response = await authApi.listUsers()
      return response.data
    },
    enabled,
  })
}

/** Update role and keep users list in sync. */
export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: UserRoleUpdateRequest }) => {
      const response = await authApi.updateUserRole(userId, data)
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.managementUsers })
    },
  })
}
