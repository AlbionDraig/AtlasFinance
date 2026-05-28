import { describe, expect, it, vi } from 'vitest'
import { invalidateQueryKeys } from './reactQuery'

describe('invalidateQueryKeys', () => {
  it('invalidates every query key in parallel', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as never
    const queryKeys = [['transactions'], ['accounts'], ['pockets']]

    await invalidateQueryKeys(queryClient, queryKeys)

    expect(invalidateQueries).toHaveBeenCalledTimes(3)
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['transactions'] })
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['accounts'] })
    expect(invalidateQueries).toHaveBeenNthCalledWith(3, { queryKey: ['pockets'] })
  })
})