import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'
import Select from '@/components/ui/Select'
import TimePicker from '@/components/ui/TimePicker'
import type { Account } from '@/types'
import type { Category } from '@/api/categories'
import type { FormState, TransactionType } from '../types'

interface TransactionFormCardProps {
  form: FormState
  errors: Partial<Record<keyof FormState, string>>
  setForm: Dispatch<SetStateAction<FormState>>
  setErrors: Dispatch<SetStateAction<Partial<Record<keyof FormState, string>>>>
  accounts: Account[]
  categoryOptions: Category[]
  accountCurrency: string
  saving: boolean
  maxDate: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onReset: () => void
}

export default function TransactionFormCard({
  form,
  errors,
  setForm,
  setErrors,
  accounts,
  categoryOptions,
  accountCurrency,
  saving,
  maxDate,
  onSubmit,
  onReset,
}: TransactionFormCardProps) {
  const { t } = useTranslation()
  const submitLabel = saving ? t('transactions.submitting') : t('transactions.submit')

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-6">

      <div className="space-y-1">
        <label className="app-label">{t('transactions.field_description')}</label>
        <input
          type="text"
          value={form.description}
          onChange={(event) => {
            setForm((current) => ({ ...current, description: event.target.value }))
            setErrors((current) => ({ ...current, description: undefined }))
          }}
          className={`app-control w-full ${errors.description ? 'border-warning' : ''}`}
          placeholder={t('transactions.field_description_placeholder')}
        />
        {errors.description && <p className="mt-1 text-xs tone-negative">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="app-label">{t('transactions.field_type')}</label>
          <Select
            value={form.transactionType}
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                transactionType: value as TransactionType,
                // Reset category because available options depend on transaction type.
                categoryId: 'none',
              }))
              setErrors((current) => ({ ...current, transactionType: undefined, categoryId: undefined }))
            }}
            options={[
              { value: '', label: t('transactions.select_type') },
              { value: 'EXPENSE', label: t('transactions.type_expense') },
              { value: 'INCOME', label: t('transactions.type_income') },
            ]}
            className="w-full"
          />
          {errors.transactionType && <p className="mt-1 text-xs tone-negative">{errors.transactionType}</p>}
        </div>

        <div className="space-y-1">
          <label className="app-label">{t('transactions.field_amount')}</label>
          <AmountInput
            value={form.amount}
            onChange={(raw) => {
              setForm((current) => ({ ...current, amount: raw }))
              setErrors((current) => ({ ...current, amount: undefined }))
            }}
            currency={accountCurrency}
            className="w-full"
          />
          {errors.amount && <p className="mt-1 text-xs tone-negative">{errors.amount}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="app-label">{t('transactions.field_account')}</label>
          <Select
            value={form.accountId}
            onChange={(value) => {
              setForm((current) => ({ ...current, accountId: value }))
              setErrors((current) => ({ ...current, accountId: undefined }))
            }}
            options={[
              { value: '', label: t('transactions.select_account') },
              ...accounts.map((account) => ({ value: String(account.id), label: `${account.name} (${account.currency})` })),
            ]}
            className="w-full"
            disabled={!accounts.length}
          />
          {errors.accountId && <p className="mt-1 text-xs tone-negative">{errors.accountId}</p>}
        </div>

        <div className="space-y-1">
          <label className="app-label">{t('transactions.field_category')}</label>
          <Select
            value={form.categoryId}
            onChange={(value) => {
              setForm((current) => ({ ...current, categoryId: value }))
              setErrors((current) => ({ ...current, categoryId: undefined }))
            }}
            options={[
              { value: 'none', label: t('transactions.no_category') },
              ...categoryOptions.map((category) => ({ value: String(category.id), label: category.name })),
            ]}
            className="w-full"
          />
          {errors.categoryId && <p className="mt-1 text-xs tone-negative">{errors.categoryId}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <DatePicker
            label={t('transactions.field_date')}
            value={form.occurredDate}
            onChange={(value) => {
              setForm((current) => ({ ...current, occurredDate: value }))
              setErrors((current) => ({ ...current, occurredDate: undefined }))
            }}
            max={maxDate}
            className="w-full"
          />
          {errors.occurredDate && <p className="text-xs tone-negative">{errors.occurredDate}</p>}
        </div>
        <div className="space-y-1">
          <TimePicker
            label={t('transactions.field_time')}
            value={form.occurredTime}
            onChange={(value) => {
              setForm((current) => ({ ...current, occurredTime: value }))
              setErrors((current) => ({ ...current, occurredTime: undefined }))
            }}
            className="w-full"
          />
          {errors.occurredTime && <p className="text-xs tone-negative">{errors.occurredTime}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button type="submit" className="app-btn-primary" disabled={saving || !accounts.length}>
          {submitLabel}
        </button>
        <button type="button" className="app-btn-secondary order-last sm:order-none" onClick={onReset}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
