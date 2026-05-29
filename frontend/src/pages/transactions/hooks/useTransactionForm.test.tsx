import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTransactionForm } from './useTransactionForm'

describe('useTransactionForm', () => {
  const accounts = [
    {
      id: 3,
      name: 'Primary account',
      bank_id: 1,
      account_type: 'checking',
      currency: 'USD',
      balance: 100,
    },
  ] as never

  const categories = [
    {
      id: 8,
      name: 'Salary',
      description: 'Salary income',
      category_type: 'income',
      is_fixed: false,
    },
    {
      id: 9,
      name: 'Food',
      description: 'Food expense',
      category_type: 'expense',
      is_fixed: false,
    },
  ] as never

  it('maps transaction values into form fields when editing', () => {
    const { result } = renderHook(() => useTransactionForm(accounts, categories))

    act(() => {
      result.current.prepareEdit({
        id: 25,
        description: 'May salary',
        amount: 1250,
        account_id: 3,
        category_id: 8,
        pocket_id: null,
        currency: 'USD',
        transaction_type: 'INCOME',
        occurred_at: '2026-05-12T10:30:00',
      })
    })

    expect(result.current.editingId).toBe(25)
    expect(result.current.modalOpen).toBe(true)
    expect(result.current.form).toMatchObject({
      description: 'May salary',
      amount: '1250',
      accountId: '3',
      categoryId: '8',
      transactionType: 'INCOME',
      occurredDate: '2026-05-12',
      occurredTime: '10:30',
    })
  })

  it('returns validation errors for an incomplete form', () => {
    const { result } = renderHook(() => useTransactionForm(accounts, categories))

    act(() => {
      result.current.setForm({
        description: '',
        amount: '0',
        accountId: '',
        categoryId: 'none',
        transactionType: 'EXPENSE',
        occurredDate: '',
        occurredTime: '',
      })
    })

    const errors = result.current.validate()
    expect(errors.description).toBeTruthy()
    expect(errors.amount).toBeTruthy()
    expect(errors.accountId).toBeTruthy()
    expect(errors.categoryId).toBeTruthy()
    expect(errors.occurredDate).toBeTruthy()
    expect(errors.occurredTime).toBeTruthy()
  })

  it('resets the form when opening create modal after editing', () => {
    const { result } = renderHook(() => useTransactionForm(accounts, categories))

    act(() => {
      result.current.prepareEdit({
        id: 11,
        description: 'Old transaction',
        amount: 25,
        account_id: 3,
        category_id: 9,
        pocket_id: null,
        currency: 'USD',
        transaction_type: 'EXPENSE',
        occurred_at: '2026-05-14T09:00:00',
      })
    })

    act(() => {
      result.current.openCreateModal()
    })

    expect(result.current.modalOpen).toBe(true)
    expect(result.current.editingId).toBeNull()
    expect(result.current.form).toEqual({
      description: '',
      amount: '',
      accountId: '',
      categoryId: 'none',
      transactionType: '',
      occurredDate: '',
      occurredTime: '',
    })
  })
})