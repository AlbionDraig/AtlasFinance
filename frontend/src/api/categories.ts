import apiClient from '@/lib/axios'

export interface Category {
  id: number
  name: string
}

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/categories'),
}
