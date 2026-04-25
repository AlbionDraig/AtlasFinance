import apiClient from '@/lib/axios'

export interface Category {
  id: number
  name: string
  is_fixed: boolean
}

export interface CategoryPayload {
  name: string
  is_fixed: boolean
}

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/categories'),
  create: (payload: CategoryPayload) => apiClient.post<Category>('/categories/', payload),
  update: (id: number, payload: CategoryPayload) => apiClient.put<Category>(`/categories/${id}`, payload),
  delete: (id: number) => apiClient.delete(`/categories/${id}`),
}
