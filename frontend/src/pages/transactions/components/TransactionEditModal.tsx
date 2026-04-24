import { useEffect, type FormEvent, type Dispatch, type SetStateAction } from 'react'
import TransactionFormCard from './TransactionFormCard'
import type { Account } from '@/types'
import type { Category } from '@/api/categories'
import type { FormState } from '../types'

interface TransactionEditModalProps {
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  accounts: Account[]
  categoryOptions: Category[]
  accountCurrency: string
  editingId: number | null
  saving: boolean
  formError: string | null
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
  formError,
  maxDate,
  onSubmit,
  onClose,
}: TransactionEditModalProps) {
  // Close on Escape
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <TransactionFormCard
          form={form}
          setForm={setForm}
          accounts={accounts}
          categoryOptions={categoryOptions}
          accountCurrency={accountCurrency}
          editingId={editingId}
          saving={saving}
          formError={formError}
          maxDate={maxDate}
          onSubmit={onSubmit}
          onReset={onClose}
        />
      </div>
    </div>
  )
}
