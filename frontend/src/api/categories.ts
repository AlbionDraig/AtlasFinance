import apiClient from '@/lib/axios'

export interface Category {
  id: number
  name: string
  is_fixed: boolean
}

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/categories'),
}
