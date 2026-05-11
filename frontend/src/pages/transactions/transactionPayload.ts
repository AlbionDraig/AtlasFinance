/**
 * Validation and payload construction for transaction forms.
 * Pure functions — no React, no API, no state.
 */
import type { Account, Transaction } from '@/types'
import type { FormState, TransactionType } from './types'

export type TransactionFormErrors = Partial<Record<keyof FormState, string>>

export interface TransactionValidationMessages {
  descShort: string
  selectType: string
  amountZero: string
  selectAccount: string
  categoryRequired: string
  selectDate: string
  selectTime: string
  noAccount: string
}

export function validateTransactionForm(
  form: FormState,
  selectedAccount: Account | null,
  messages: TransactionValidationMessages,
): TransactionFormErrors {
  const errors: TransactionFormErrors = {}
  if (form.description.trim().length < 2) errors.description = messages.descShort
  if (!form.transactionType) errors.transactionType = messages.selectType
  const amount = Number(form.amount)
  if (Number.isNaN(amount) || amount <= 0) errors.amount = messages.amountZero
  if (!form.accountId) errors.accountId = messages.selectAccount
  if (form.transactionType === 'EXPENSE' && (!form.categoryId || form.categoryId === 'none')) {
    errors.categoryId = messages.categoryRequired
  }
  if (!form.occurredDate) errors.occurredDate = messages.selectDate
  if (!form.occurredTime) errors.occurredTime = messages.selectTime
  if (!selectedAccount) errors.accountId = messages.noAccount
  return errors
}

export function buildTransactionPayload(
  form: FormState,
  account: Account,
): Omit<Transaction, 'id'> {
  const occurredAt = `${form.occurredDate}T${form.occurredTime || '00:00'}:00`
  return {
    account_id: account.id,
    amount: Number(form.amount),
    description: form.description.trim(),
    category_id: form.categoryId === 'none' ? null : Number(form.categoryId),
    pocket_id: null,
    currency: account.currency,
    transaction_type: (form.transactionType as TransactionType).toLowerCase() as Transaction['transaction_type'],
    occurred_at: occurredAt,
  }
}
