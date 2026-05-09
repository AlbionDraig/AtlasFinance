/**
 * Encapsulates the transaction create/edit form: state, validation, modal flags,
 * derived account/currency, and category options filtered by transaction type.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category } from '@/api/categories'
import type { Account, Transaction } from '@/types'
import { toDateInputValue, toTimeInputValue } from '../transactionUtils'
import {
  type TransactionFormErrors,
  type TransactionValidationMessages,
  validateTransactionForm,
} from '../transactionPayload'
import type { FormState } from '../types'

// ─── Defaults ─────────────────────────────────────────────────────────────────

function buildDefaultForm(): FormState {
  return {
    description: '',
    amount: '',
    accountId: '',
    categoryId: 'none',
    transactionType: '',
    occurredDate: '',
    occurredTime: '',
  }
}

// ─── Result contract ──────────────────────────────────────────────────────────

export interface TransactionFormResult {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  formErrors: TransactionFormErrors
  setFormErrors: React.Dispatch<React.SetStateAction<TransactionFormErrors>>
  editingId: number | null
  modalOpen: boolean
  transferOpen: boolean
  moveToPocketOpen: boolean
  setTransferOpen: (open: boolean) => void
  setMoveToPocketOpen: (open: boolean) => void
  selectedAccount: Account | null
  accountCurrency: 'COP' | 'USD'
  categoryOptions: Category[]
  /** Clears form state and closes the create/edit modal. */
  resetForm: () => void
  /** Opens the create modal with a blank form. */
  openCreateModal: () => void
  /** Populates the form from an existing transaction and opens the edit modal. */
  prepareEdit: (transaction: Transaction) => void
  /** Validates the current form state. Returns errors (empty object = valid). */
  validate: () => TransactionFormErrors
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param accounts  - Used to derive `selectedAccount` and `accountCurrency`.
 * @param categories - Used to filter `categoryOptions` by transaction type.
 */
export function useTransactionForm(
  accounts: Account[],
  categories: Category[],
): TransactionFormResult {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(buildDefaultForm)
  const [formErrors, setFormErrors] = useState<TransactionFormErrors>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [moveToPocketOpen, setMoveToPocketOpen] = useState(false)

  const selectedAccount = useMemo(
    () => accounts.find((a) => String(a.id) === form.accountId) ?? null,
    [accounts, form.accountId],
  )
  const accountCurrency = (selectedAccount?.currency ?? 'COP') as 'COP' | 'USD'

  const categoryOptions = useMemo(() => {
    const filtered = categories.filter((c) =>
      form.transactionType === 'INCOME'
        ? c.category_type !== 'expense'
        : c.category_type !== 'income',
    )
    return filtered.length ? filtered : categories
  }, [categories, form.transactionType])

  function resetForm() {
    setEditingId(null)
    setModalOpen(false)
    setForm(buildDefaultForm())
    setFormErrors({})
  }

  function openCreateModal() {
    resetForm()
    setModalOpen(true)
  }

  function prepareEdit(transaction: Transaction) {
    const occurredAt = new Date(transaction.occurred_at)
    setEditingId(transaction.id)
    setModalOpen(true)
    setForm({
      description: transaction.description,
      amount: String(transaction.amount),
      accountId: String(transaction.account_id),
      categoryId: transaction.category_id == null ? 'none' : String(transaction.category_id),
      transactionType:
        String(transaction.transaction_type ?? '').toLowerCase() === 'income' ? 'INCOME' : 'EXPENSE',
      occurredDate: toDateInputValue(occurredAt),
      occurredTime: toTimeInputValue(occurredAt),
    })
    setFormErrors({})
  }

  function buildMessages(): TransactionValidationMessages {
    return {
      descShort: t('transactions.toast_desc_short'),
      selectType: t('transactions.toast_select_type'),
      amountZero: t('transactions.toast_amount_zero'),
      selectAccount: t('transactions.toast_select_account'),
      categoryRequired: t('transactions.toast_category_required'),
      selectDate: t('transactions.toast_select_date'),
      selectTime: t('transactions.toast_select_time'),
      noAccount: t('transactions.toast_no_account'),
    }
  }

  function validate(): TransactionFormErrors {
    return validateTransactionForm(form, selectedAccount, buildMessages())
  }

  return {
    form,
    setForm,
    formErrors,
    setFormErrors,
    editingId,
    modalOpen,
    transferOpen,
    moveToPocketOpen,
    setTransferOpen,
    setMoveToPocketOpen,
    selectedAccount,
    accountCurrency,
    categoryOptions,
    resetForm,
    openCreateModal,
    prepareEdit,
    validate,
  }
}
