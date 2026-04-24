import apiClient from '@/lib/axios'
import type { LoginRequest, RegisterRequest, TokenResponse, User } from '@/types'

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

  logout: () => apiClient.post('/auth/logout'),
}
