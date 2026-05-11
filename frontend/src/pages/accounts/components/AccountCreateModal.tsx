import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import FloatingModalFrame from '@/components/ui/FloatingModalFrame'
import Select from '@/components/ui/Select'
import type { Bank } from '@/api/banks'

interface AccountFormState {
  name: string
  accountType: 'savings' | 'checking' | ''
  currency: 'COP' | 'USD' | ''
  bankId: string
}

interface AccountCreateModalProps {
  form: AccountFormState
  errors: Partial<Record<'name' | 'accountType' | 'currency' | 'bankId', string>>
  setForm: Dispatch<SetStateAction<AccountFormState>>
  banks: Bank[]
  saving: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

export default function AccountCreateModal({
  form,
  errors,
  setForm,
  banks,
  saving,
  onSubmit,
  onClose,
}: AccountCreateModalProps) {
  const { t } = useTranslation()
  return (
    <FloatingModalFrame
      title={t('accounts.create_title')}
      subtitle={t('accounts.create_desc')}
      onClose={onClose}
      maxWidth="max-w-2xl"
      overflow="visible"
      bodyClassName="p-0"
      icon={
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      }
    >
        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div className="space-y-1">
            <label className="app-label">{t('accounts.field_name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className={`app-control w-full ${errors.name ? 'border-warning' : ''}`}
              placeholder={t('accounts.field_name_placeholder')}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs tone-negative">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="app-label">{t('accounts.field_type')}</label>
              <Select
                value={form.accountType}
                onChange={(value) => setForm((current) => ({ ...current, accountType: value as 'savings' | 'checking' | '' }))}
                options={[
                  { value: '', label: t('accounts.select_type') },
                  { value: 'savings', label: t('accounts.type_savings') },
                  { value: 'checking', label: t('accounts.type_checking') },
                ]}
                className="w-full"
              />
              {errors.accountType && <p className="mt-1 text-xs tone-negative">{errors.accountType}</p>}
            </div>

            <div className="space-y-1">
              <label className="app-label">{t('accounts.field_currency')}</label>
              <Select
                value={form.currency}
                onChange={(value) => setForm((current) => ({ ...current, currency: value as 'COP' | 'USD' | '' }))}
                options={[
                  { value: '', label: t('accounts.select_currency') },
                  { value: 'COP', label: 'COP' },
                  { value: 'USD', label: 'USD' },
                ]}
                className="w-full"
              />
              {errors.currency && <p className="mt-1 text-xs tone-negative">{errors.currency}</p>}
            </div>

            <div className="space-y-1">
              <label className="app-label">{t('accounts.field_bank')}</label>
              <Select
                value={form.bankId}
                onChange={(value) => setForm((current) => ({ ...current, bankId: value }))}
                options={[
                  { value: '', label: banks.length ? t('accounts.select_bank') : t('accounts.no_banks') },
                  ...banks.map((bank) => ({ value: String(bank.id), label: `${bank.name} (${bank.country_code})` })),
                ]}
                className="w-full"
                disabled={!banks.length}
              />
              {errors.bankId && <p className="mt-1 text-xs tone-negative">{errors.bankId}</p>}
            </div>
          </div>

          {!banks.length && (
            // Account creation requires at least one bank configured by the user.
            <p className="text-sm text-warning-text bg-warning-bg rounded-lg px-3 py-2">
              {t('accounts.no_banks_warning')}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button type="submit" className="app-btn-primary" disabled={saving || !banks.length}>
              {saving ? t('common.saving') : t('accounts.fab_create')}
            </button>
            <button type="button" className="app-btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
    </FloatingModalFrame>
  )
}
