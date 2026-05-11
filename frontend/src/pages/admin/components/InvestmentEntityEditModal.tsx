import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import FloatingModalFrame from '@/components/ui/FloatingModalFrame'
import Select from '@/components/ui/Select'
import type { InvestmentEntity, InvestmentEntityType } from '@/api/investmentEntities'

interface InvestmentEntityEditModalProps {
  entity: InvestmentEntity
  countryOptions: Array<{ value: string; label: string }>
  typeOptions: Array<{ value: string; label: string }>
  saving: boolean
  onSubmit: (id: number, data: { name: string; entity_type: InvestmentEntityType; country_code: string }) => void
  onClose: () => void
}

export default function InvestmentEntityEditModal({
  entity,
  countryOptions,
  typeOptions,
  saving,
  onSubmit,
  onClose,
}: InvestmentEntityEditModalProps) {
  const { t } = useTranslation()

  const [name, setName] = useState(entity.name)
  const [entityType, setEntityType] = useState<InvestmentEntityType>(entity.entity_type)
  const [countryCode, setCountryCode] = useState(entity.country_code)
  const [errors, setErrors] = useState<{ name?: string; countryCode?: string }>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: { name?: string; countryCode?: string } = {}
    if (name.trim().length < 2) nextErrors.name = t('admin.entities.toast_name_short')
    if (!countryCode.trim()) nextErrors.countryCode = t('admin.entities.toast_no_country')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit(entity.id, {
      name: name.trim(),
      entity_type: entityType,
      country_code: countryCode.trim().toUpperCase(),
    })
  }

  return (
    <FloatingModalFrame
      title={t('admin.entities.edit_title')}
      subtitle={t('admin.entities.edit_desc')}
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
            <label className="app-label">{t('admin.entities.field_name')}</label>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setErrors((current) => ({ ...current, name: undefined }))
              }}
              className={`app-control w-full ${errors.name ? 'border-warning' : ''}`}
              placeholder={t('admin.entities.field_name_placeholder')}
              autoFocus
              maxLength={120}
            />
            {errors.name && <p className="mt-1 text-xs tone-negative">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <label className="app-label">{t('admin.entities.field_type')}</label>
            <Select
              value={entityType}
              onChange={(value) => setEntityType(value as InvestmentEntityType)}
              options={typeOptions}
              className="w-full"
              active
            />
          </div>

          <div className="space-y-1">
            <label className="app-label">{t('admin.entities.field_country_code')}</label>
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
            <button type="submit" className="app-btn-primary" disabled={saving || name.trim().length < 2}>
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
