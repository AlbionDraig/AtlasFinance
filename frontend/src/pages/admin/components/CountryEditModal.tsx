import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import FloatingModalFrame from '@/components/ui/FloatingModalFrame'
import type { Country } from '@/api/countries'

interface CountryEditModalProps {
  country: Country
  saving: boolean
  onSubmit: (id: number, name: string, code: string) => void
  onClose: () => void
}

export default function CountryEditModal({ country, saving, onSubmit, onClose }: CountryEditModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(country.name)
  const [code, setCode] = useState(country.code)
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = name.trim()
    const normalizedCode = code.trim().toUpperCase()
    const nextErrors: { name?: string; code?: string } = {}
    if (normalizedName.length < 2) nextErrors.name = t('admin.countries.toast_name_short')
    if (normalizedCode.length < 2) nextErrors.code = t('admin.countries.toast_code_short')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit(country.id, normalizedName, normalizedCode)
  }

  return (
    <FloatingModalFrame
      title={t('admin.countries.edit_title')}
      subtitle={t('admin.countries.edit_desc')}
      onClose={onClose}
      maxWidth="max-w-xl"
      overflow="visible"
      bodyClassName="p-0"
      icon={
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
          <path d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5zM15.71 6.29a1 1 0 000-1.41l-1.58-1.58a1 1 0 00-1.41 0l-1.24 1.24 2.99 2.99 1.24-1.24z" fill="currentColor" />
        </svg>
      }
    >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-1">
            <label className="app-label">{t('admin.countries.field_name')}</label>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setErrors((current) => ({ ...current, name: undefined }))
              }}
              className={`app-control w-full ${errors.name ? 'border-warning' : ''}`}
              placeholder={t('admin.countries.field_name_placeholder')}
              autoFocus
              maxLength={120}
            />
            {errors.name && <p className="mt-1 text-xs tone-negative">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <label className="app-label">{t('admin.countries.field_code')}</label>
            <input
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase())
                setErrors((current) => ({ ...current, code: undefined }))
              }}
              className={`app-control w-full ${errors.code ? 'border-warning' : ''}`}
              placeholder={t('admin.countries.field_code_placeholder')}
              maxLength={3}
            />
            {errors.code && <p className="mt-1 text-xs tone-negative">{errors.code}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="submit"
              className="app-btn-primary"
              disabled={saving || name.trim().length < 2 || code.trim().length < 2}
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <button type="button" className="app-btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
    </FloatingModalFrame>
  )
}