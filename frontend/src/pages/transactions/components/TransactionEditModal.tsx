import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
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
  setForm: Dispatch<SetStateAction<FormState>>
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
  setForm,
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

  const accentClass = isEditing ? 'border-t-warning' : 'border-t-brand'
  const headerClass = isEditing
    ? 'border-b border-warning/10 bg-warning-bg'
    : 'border-b border-brand/10 bg-brand-light'
  const iconClass = isEditing
    ? 'bg-warning text-white shadow-[0_0_0_5px_rgba(196,122,0,0.10)]'
    : 'bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]'
  const titleClass = isEditing ? 'text-warning-text' : 'text-brand-text'

  return (
    <Modal onClose={onClose} maxWidth="max-w-4xl">
      <div className={`w-full rounded-2xl border border-neutral-100 border-t-4 ${accentClass} bg-white shadow-xl overflow-visible`}>
        <div className={`flex items-start gap-3 px-6 py-4 ${headerClass}`}>
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
            {isEditing ? <EditModeIcon /> : <RegisterModeIcon />}
          </div>
          <div>
            <h2 className={`app-section-title ${titleClass}`}>
              {isEditing ? t('transactions.form_edit_title') : t('transactions.form_register_title')}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-700">
              {isEditing ? t('transactions.form_edit_desc') : t('transactions.form_register_desc')}
            </p>
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
        <TransactionFormCard
          form={form}
          setForm={setForm}
          accounts={accounts}
          categoryOptions={categoryOptions}
          accountCurrency={accountCurrency}
          saving={saving}
          maxDate={maxDate}
          onSubmit={onSubmit}
          onReset={onClose}
        />
      </div>
    </Modal>
  )
}
