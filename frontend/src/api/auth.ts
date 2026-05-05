import apiClient from '@/lib/axios'
import type { LoginRequest, RegisterRequest, TokenResponse, User } from '@/types'

export interface UserRoleUpdateRequest {
  role: 'admin' | 'user'
}

// Optional fields supported by profile update endpoint.
export interface UpdateProfileRequest {
  full_name?: string
  email?: string
  current_password?: string
  new_password?: string
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<User>('/auth/register', data),

  me: () => apiClient.get<User>('/auth/me'),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<User>('/auth/me', data),

  listUsers: () => apiClient.get<User[]>('/auth/users'),

  updateUserRole: (userId: number, data: UserRoleUpdateRequest) =>
    apiClient.patch<User>(`/auth/users/${userId}/role`, data),

  logout: () => apiClient.post('/auth/logout'),
}
