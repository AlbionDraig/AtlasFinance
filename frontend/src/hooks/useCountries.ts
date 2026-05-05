import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { countriesApi, type Country } from '@/api/countries'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'

/**
 * Catálogo global de países usado por administración y formularios.
 *
 * Se asume estable durante la sesión (los países cambian raramente),
 * por lo que el hook se carga una sola vez al montar.
 */
export function useCountries(): { countries: Country[]; setCountries: React.Dispatch<React.SetStateAction<Country[]>> } {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [countries, setCountries] = useState<Country[]>([])

  useEffect(() => {
    async function load() {
      try {
        const response = await countriesApi.list()
        setCountries(response.data)
      } catch (error) {
        toast(getApiErrorMessage(error, t('admin.toast_load_countries_error')), 'error')
      }
    }
    void load()
  }, [])

  return { countries, setCountries }
}
