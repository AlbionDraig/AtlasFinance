import apiClient from '@/lib/axios'

// Category resource consumed by transactions and configuration views.
export interface Category {
  id: number
  name: string
  description: string | null
  is_fixed: boolean
  category_type: 'income' | 'expense' | 'any'
}

export interface CategoryPayload {
  name: string
  is_fixed: boolean
  description?: string | null
  category_type?: 'income' | 'expense' | 'any'
}

// Centralized CRUD calls for categories catalog.
export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/categories'),
  create: (data: CategoryPayload) => apiClient.post<Category>('/categories', data),
  update: (id: number, data: CategoryPayload) => apiClient.put<Category>(`/categories/${id}`, data),
  delete: (id: number) => apiClient.delete(`/categories/${id}`),
}
