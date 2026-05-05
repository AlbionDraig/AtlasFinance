import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { categoriesApi, type Category } from '@/api/categories'
import { useToast } from '@/hooks/useToast'

interface CategoriesDataResult {
  categories: Category[]
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>
  loading: boolean
}

/**
 * Carga inicial del catálogo de categorías.
 *
 * Expone `setCategories` para mutaciones optimistas (CRUD) que evitan
 * un refetch completo después de crear/editar/borrar.
 */
export function useCategoriesData(): CategoriesDataResult {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    categoriesApi
      .list()
      .then((r) => setCategories(r.data))
      .catch(() => toast(t('categories.toast_load_error'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  return { categories, setCategories, loading }
}
