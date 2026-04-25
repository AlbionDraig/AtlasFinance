import apiClient from '@/lib/axios'

export interface Category {
  id: number
  name: string
  keywords: string | null
  is_fixed: boolean
}

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/categories'),
}
