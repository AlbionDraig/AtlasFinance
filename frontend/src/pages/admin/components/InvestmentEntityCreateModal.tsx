import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import FloatingModalFrame from '@/components/ui/FloatingModalFrame'
import Select from '@/components/ui/Select'
import type { InvestmentEntityType } from '@/api/investmentEntities'

interface InvestmentEntityCreateModalProps {
  name: string
  entityType: InvestmentEntityType
  countryCode: string
  countryOptions: Array<{ value: string; label: string }>
  typeOptions: Array<{ value: string; label: string }>
  setName: (value: string) => void
  setEntityType: (value: InvestmentEntityType) => void
  setCountryCode: (value: string) => void
  saving: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

export default function InvestmentEntityCreateModal({
  name,
  entityType,
  countryCode,
  countryOptions,
  typeOptions,
  setName,
  setEntityType,
  setCountryCode,
  saving,
  onSubmit,
  onClose,
}: InvestmentEntityCreateModalProps) {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<{ name?: string; countryCode?: string }>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: { name?: string; countryCode?: string } = {}
    if (name.trim().length < 2) {
      nextErrors.name = t('admin.entities.toast_name_short')
    }
    if (!countryCode) {
      nextErrors.countryCode = t('admin.entities.toast_no_country')
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      return
    }
    onSubmit(event)
  }

  return (
    <FloatingModalFrame
      title={t('admin.entities.create_title')}
      subtitle={t('admin.entities.create_desc')}
      onClose={onClose}
      maxWidth="max-w-xl"
      overflow="visible"
      bodyClassName="p-0"
      icon={
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      }
    >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-1">
            <label className="app-label">Nombre de la entidad</label>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setErrors((current) => ({ ...current, name: undefined }))
              }}
              className={`app-control w-full ${errors.name ? 'border-warning' : ''}`}
              placeholder="Ej: Interactive Brokers"
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs tone-negative">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <label className="app-label">Tipo de entidad</label>
            <Select
              value={entityType}
              onChange={(value) => setEntityType(value as InvestmentEntityType)}
              options={typeOptions}
              className="w-full"
              active
            />
          </div>

          <div className="space-y-1">
            <label className="app-label">{t('admin.entities.field_country')}</label>
            <Select
              value={countryCode}
              onChange={(value) => {
                setCountryCode(value)
                setErrors((current) => ({ ...current, countryCode: undefined }))
              }}
              options={countryOptions}
              className="w-full"
              active
              disabled={!countryOptions.length}
            />
            {errors.countryCode && <p className="mt-1 text-xs tone-negative">{errors.countryCode}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button type="submit" className="app-btn-primary" disabled={saving}>
              {saving ? t('admin.entities.submit_creating') : t('admin.entities.submit_create')}
            </button>
            <button type="button" className="app-btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
    </FloatingModalFrame>
  )
}
