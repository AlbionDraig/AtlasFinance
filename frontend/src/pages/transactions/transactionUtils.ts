/**
 * Pure display/formatting utilities for transactions.
 * No state, no side effects — safe to import anywhere.
 */
import type { Account } from '@/types'
import type { Category } from '@/api/categories'
import type { TransactionType } from './types'

export function toDateInputValue(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toTimeInputValue(value: Date): string {
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function normalizeTransactionType(value: string | null | undefined): TransactionType {
  return String(value ?? '').toLowerCase() === 'income' ? 'INCOME' : 'EXPENSE'
}

export function getCategoryName(
  categoryId: number | null,
  categories: Category[],
  noCategory: string,
): string {
  if (categoryId == null) return noCategory
  return categories.find((c) => c.id === categoryId)?.name ?? noCategory
}

export function getAccountName(accountId: number, accounts: Account[]): string {
  const account = accounts.find((a) => a.id === accountId)
  return account ? `${account.name} (${account.currency})` : `Cuenta #${accountId}`
}

export function getCompactAccountName(accountId: number, accounts: Account[]): string {
  return getAccountName(accountId, accounts).replace(/\s+\((COP|USD)\)$/, '')
}
