import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'

interface BankCreateModalProps {
  name: string
  countryCode: string
  countryOptions: Array<{ value: string; label: string }>
  setName: (value: string) => void
  setCountryCode: (value: string) => void
  saving: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

export default function BankCreateModal({
  name,
  countryCode,
  countryOptions,
  setName,
  setCountryCode,
  saving,
  onSubmit,
  onClose,
}: BankCreateModalProps) {
  const { t } = useTranslation()
  return (
    <Modal onClose={onClose} maxWidth="max-w-xl">
      <div className="w-full rounded-2xl border border-neutral-100 border-t-4 border-t-brand bg-white shadow-xl overflow-visible">
        <div className="flex items-start gap-3 border-b border-brand/10 bg-brand-light px-6 py-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="app-section-title text-brand-text">{t('admin.banks.create_title')}</h2>
            <p className="mt-0.5 text-sm text-neutral-700">{t('admin.banks.create_desc')}</p>
          </div>
          <button
            type="button"
            aria-label={t('common.close')}
            className="ml-auto -mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div className="space-y-1">
            <label className="app-label">{t('admin.banks.field_name')}</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="app-control w-full"
              placeholder={t('admin.banks.field_name_placeholder')}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="app-label">{t('admin.banks.field_country')}</label>
            <Select
              value={countryCode}
              onChange={setCountryCode}
              options={countryOptions}
              className="w-full"
              active
              disabled={!countryOptions.length}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <button type="submit" className="app-btn-primary" disabled={saving}>
              {saving ? t('admin.banks.submit_creating') : t('admin.banks.submit_create')}
            </button>
            <button type="button" className="app-btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
