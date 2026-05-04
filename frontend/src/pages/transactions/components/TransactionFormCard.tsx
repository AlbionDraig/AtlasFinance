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
  setForm: Dispatch<SetStateAction<FormState>>
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
  setForm,
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
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          className="app-control w-full"
          placeholder={t('transactions.field_description_placeholder')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="app-label">{t('transactions.field_type')}</label>
          <Select
            value={form.transactionType}
            onChange={(value) => setForm((current) => ({
              ...current,
              transactionType: value as TransactionType,
              // Reset category because available options depend on transaction type.
              categoryId: 'none',
            }))}
            options={[
              { value: '', label: t('transactions.select_type') },
              { value: 'EXPENSE', label: t('transactions.type_expense') },
              { value: 'INCOME', label: t('transactions.type_income') },
            ]}
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <label className="app-label">{t('transactions.field_amount')}</label>
          <AmountInput
            value={form.amount}
            onChange={(raw) => setForm((current) => ({ ...current, amount: raw }))}
            currency={accountCurrency}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="app-label">{t('transactions.field_account')}</label>
          <Select
            value={form.accountId}
            onChange={(value) => setForm((current) => ({ ...current, accountId: value }))}
            options={[
              { value: '', label: t('transactions.select_account') },
              ...accounts.map((account) => ({ value: String(account.id), label: `${account.name} (${account.currency})` })),
            ]}
            className="w-full"
            disabled={!accounts.length}
          />
        </div>

        <div className="space-y-1">
          <label className="app-label">{t('transactions.field_category')}</label>
          <Select
            value={form.categoryId}
            onChange={(value) => setForm((current) => ({ ...current, categoryId: value }))}
            options={[
              { value: 'none', label: t('transactions.no_category') },
              ...categoryOptions.map((category) => ({ value: String(category.id), label: category.name })),
            ]}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DatePicker
          label={t('transactions.field_date')}
          value={form.occurredDate}
          onChange={(value) => setForm((current) => ({ ...current, occurredDate: value }))}
          max={maxDate}
          className="w-full"
        />
        <TimePicker
          label={t('transactions.field_time')}
          value={form.occurredTime}
          onChange={(value) => setForm((current) => ({ ...current, occurredTime: value }))}
          className="w-full"
        />
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
