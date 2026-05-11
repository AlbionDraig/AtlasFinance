import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Account } from '@/types'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/lib/utils'
import FloatingModalFrame from '@/components/ui/FloatingModalFrame'
import FormField from '@/components/ui/FormField'
import Select from '@/components/ui/Select'
import AmountInput from '@/components/ui/AmountInput'
import InlineAlert from '@/components/ui/InlineAlert'

export interface PocketFormState {
  name: string
  balance: string
  account_id: string
}

export const EMPTY_POCKET_FORM: PocketFormState = {
  name: '',
  balance: '',
  account_id: '',
}

interface PocketModalProps {
  title: string
  isEditing: boolean
  form: PocketFormState
  setForm: Dispatch<SetStateAction<PocketFormState>>
  accounts: Account[]
  currentBalance?: number
  currentCurrency?: string
  saving: boolean
  submitLabel: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

export default function PocketModal({
  title,
  isEditing,
  form,
  setForm,
  accounts,
  currentBalance,
  currentCurrency,
  saving,
  submitLabel,
  onSubmit,
  onClose,
}: PocketModalProps) {
  const { t } = useTranslation()
  const selectedAccount = accounts.find((account) => String(account.id) === form.account_id)

  return (
    <FloatingModalFrame
      title={title}
      onClose={onClose}
      maxWidth="max-w-md"
      overflow="visible"
      bodyClassName="p-0"
      icon={isEditing ? (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
          <path d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5zM15.71 6.29a1 1 0 000-1.41l-1.58-1.58a1 1 0 00-1.41 0l-1.24 1.24 2.99 2.99 1.24-1.24z" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    >
        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <FormField label={t('pockets.field_name')}>
            <input
              className="app-control"
              type="text"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={t('pockets.field_name_placeholder')}
              maxLength={120}
              autoFocus
            />
          </FormField>

          <FormField label={t('pockets.field_account')}>
            <Select
              value={form.account_id}
              onChange={(value) => setForm((current) => ({ ...current, account_id: value }))}
              options={[
                { value: '', label: t('pockets.field_account_select') },
                ...accounts.map((account) => ({
                  value: String(account.id),
                  label: `${account.name} · ${account.currency}`,
                })),
              ]}
              className="w-full"
              active={Boolean(form.account_id)}
            />
          </FormField>

          {!isEditing ? (
            <FormField label={t('pockets.field_initial_balance')}>
              <AmountInput
                value={form.balance}
                onChange={(raw) => setForm((current) => ({ ...current, balance: raw }))}
                currency={selectedAccount?.currency ?? 'COP'}
                className="w-full"
                placeholder="0"
              />
              <InlineAlert
                className="mt-2"
                message={
                  <>
                    {t('pockets.initial_balance_alert')}
                  </>
                }
              />
            </FormField>
          ) : (
            <FormField label={t('pockets.field_current_balance')}>
              <p className="app-control w-full min-h-10 flex items-center text-neutral-700">
                {formatCurrency(currentBalance ?? 0, currentCurrency ?? selectedAccount?.currency ?? 'COP')}
              </p>
            </FormField>
          )}

          <p className="text-xs text-neutral-400">
            {t('pockets.currency_note', { currency: selectedAccount?.currency ?? 'N/A' })}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="app-btn-primary"
            >
              {saving ? t('pockets.submitting') : submitLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="app-btn-secondary"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
    </FloatingModalFrame>
  )
}
