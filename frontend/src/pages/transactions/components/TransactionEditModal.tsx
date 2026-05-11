import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import FloatingModalFrame from '@/components/ui/FloatingModalFrame'
import TransactionFormCard from './TransactionFormCard'
import type { Account } from '@/types'
import type { Category } from '@/api/categories'
import type { FormState } from '../types'

function RegisterModeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
    </svg>
  )
}

function EditModeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M4.5 14.5 4 16l1.5-.5L14 7 12.5 5.5 4.5 14.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11.5 6.5 13 5a1.4 1.4 0 0 1 2 0l.5.5a1.4 1.4 0 0 1 0 2L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

interface TransactionEditModalProps {
  form: FormState
  errors: Partial<Record<keyof FormState, string>>
  setForm: Dispatch<SetStateAction<FormState>>
  setErrors: Dispatch<SetStateAction<Partial<Record<keyof FormState, string>>>>
  accounts: Account[]
  categoryOptions: Category[]
  accountCurrency: string
  editingId: number | null
  saving: boolean
  maxDate: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

export default function TransactionEditModal({
  form,
  errors,
  setForm,
  setErrors,
  accounts,
  categoryOptions,
  accountCurrency,
  editingId,
  saving,
  maxDate,
  onSubmit,
  onClose,
}: TransactionEditModalProps) {
  const { t } = useTranslation()
  const isEditing = editingId != null

  return (
    <FloatingModalFrame
      title={isEditing ? t('transactions.form_edit_title') : t('transactions.form_register_title')}
      subtitle={isEditing ? t('transactions.form_edit_desc') : t('transactions.form_register_desc')}
      onClose={onClose}
      maxWidth="max-w-4xl"
      accent={isEditing ? 'warning' : 'brand'}
      overflow="visible"
      bodyClassName="p-0"
      icon={isEditing ? <EditModeIcon /> : <RegisterModeIcon />}
    >
        <TransactionFormCard
          form={form}
          errors={errors}
          setForm={setForm}
          setErrors={setErrors}
          accounts={accounts}
          categoryOptions={categoryOptions}
          accountCurrency={accountCurrency}
          saving={saving}
          maxDate={maxDate}
          onSubmit={onSubmit}
          onReset={onClose}
        />
    </FloatingModalFrame>
  )
}
