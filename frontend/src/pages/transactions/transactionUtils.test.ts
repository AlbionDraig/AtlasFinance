import { describe, expect, it } from 'vitest'
import type { Account } from '@/types'
import type { Category } from '@/api/categories'
import { getAccountName, getCategoryName, getCompactAccountName, normalizeTransactionType, toDateInputValue, toTimeInputValue } from './transactionUtils'

describe('transactionUtils', () => {
  it('formats date and time input values', () => {
    const date = new Date(2026, 4, 28, 9, 7)

    expect(toDateInputValue(date)).toBe('2026-05-28')
    expect(toTimeInputValue(date)).toBe('09:07')
  })

  it('normalizes transaction type values', () => {
    expect(normalizeTransactionType('income')).toBe('INCOME')
    expect(normalizeTransactionType('expense')).toBe('EXPENSE')
    expect(normalizeTransactionType(undefined)).toBe('EXPENSE')
  })

  it('resolves category and account display names', () => {
    const categories = [{ id: 1, name: 'Food', description: '', is_fixed: false, category_type: 'income' }] as Category[]
    const accounts = [{ id: 7, name: 'Main account', currency: 'COP', bank_id: 1, account_type: 'checking', balance: 0 }] as Account[]

    expect(getCategoryName(1, categories, 'No category')).toBe('Food')
    expect(getCategoryName(null, categories, 'No category')).toBe('No category')
    expect(getAccountName(7, accounts)).toBe('Main account (COP)')
    expect(getCompactAccountName(7, accounts)).toBe('Main account')
    expect(getCompactAccountName(99, accounts)).toBe('Cuenta #99')
  })
})