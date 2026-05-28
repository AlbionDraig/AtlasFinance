import type { QueryClient, QueryKey } from '@tanstack/react-query'

export async function invalidateQueryKeys(queryClient: QueryClient, queryKeys: QueryKey[]): Promise<void> {
  await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}