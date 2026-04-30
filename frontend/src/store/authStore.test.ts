import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'
import type { User } from '@/types'

const mockUser: User = {
  id: 1,
  email: 'demo@atlas.test',
  full_name: 'Demo User',
}

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('starts with no user', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setUser stores the user object', () => {
    useAuthStore.getState().setUser(mockUser)
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })

  it('logout clears the user', () => {
    useAuthStore.getState().setUser(mockUser)
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
