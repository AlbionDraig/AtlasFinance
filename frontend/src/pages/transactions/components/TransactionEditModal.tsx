import Modal from '@/components/ui/Modal'
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
  return (
    <Modal onClose={onClose}>
      <TransactionFormCard
        form={form}
        setForm={setForm}
        accounts={accounts}
        categoryOptions={categoryOptions}
        accountCurrency={accountCurrency}
        editingId={editingId}
        saving={saving}
        maxDate={maxDate}
        onSubmit={onSubmit}
        onReset={onClose}
      />
    </Modal>
  )
}
