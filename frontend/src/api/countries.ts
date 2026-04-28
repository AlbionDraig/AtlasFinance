import apiClient from '@/lib/axios'

// Country catalog item used by banks and investment entities.
export interface Country {
  id: number
  code: string
  name: string
}

export interface CountryCreatePayload {
  code: string
  name: string
}

export interface CountryUpdatePayload {
  code?: string
  name?: string
}

// CRUD access for countries catalog.
export const countriesApi = {
  list: () => apiClient.get<Country[]>('/countries'),
  create: (data: CountryCreatePayload) => apiClient.post<Country>('/countries', data),
  update: (id: number, data: CountryUpdatePayload) => apiClient.put<Country>(`/countries/${id}`, data),
  delete: (id: number) => apiClient.delete(`/countries/${id}`),
}