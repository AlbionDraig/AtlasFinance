import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import FloatingModalFrame from '@/components/ui/FloatingModalFrame'
import type { Bank } from '@/api/banks'
import Select from '@/components/ui/Select'

interface BankEditModalProps {
  bank: Bank
  countryOptions: Array<{ value: string; label: string }>
  saving: boolean
  onSubmit: (id: number, name: string, countryCode: string) => void
  onClose: () => void
}

export default function BankEditModal({ bank, countryOptions, saving, onSubmit, onClose }: BankEditModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(bank.name)
  const [countryCode, setCountryCode] = useState(bank.country_code)
  const [errors, setErrors] = useState<{ name?: string; countryCode?: string }>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: { name?: string; countryCode?: string } = {}
    if (name.trim().length < 2) nextErrors.name = t('admin.banks.toast_name_short')
    if (!countryCode.trim()) nextErrors.countryCode = t('admin.banks.toast_no_country')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit(bank.id, name.trim(), countryCode.trim().toUpperCase())
  }

  return (
    <FloatingModalFrame
      title={t('admin.banks.edit_title')}
      subtitle={t('admin.banks.edit_desc')}
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
            <label className="app-label">{t('admin.banks.field_name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((current) => ({ ...current, name: undefined }))
              }}
              className={`app-control w-full ${errors.name ? 'border-warning' : ''}`}
              placeholder={t('admin.banks.field_name_placeholder')}
              autoFocus
              maxLength={120}
            />
            {errors.name && <p className="mt-1 text-xs tone-negative">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <label className="app-label">{t('admin.banks.field_country_code')}</label>
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
