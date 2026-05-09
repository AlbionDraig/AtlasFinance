import type { PocketPayload, PocketUpdatePayload } from '@/api/pockets'

export interface PocketFormState {
  name: string
  balance: string
  account_id: string
}

export type PocketFormErrors = Partial<Record<keyof PocketFormState, string>>

interface PocketValidationMessages {
  nameShort: string
  selectAccount: string
  invalidBalance: string
  invalidAccount: string
}

type CurrencyResolver = (accountId: number) => 'COP' | 'USD' | null

export function buildCreatePocketPayload(
  form: PocketFormState,
  resolveCurrency: CurrencyResolver,
  messages: PocketValidationMessages,
): { payload: PocketPayload | null; errors: PocketFormErrors; fallbackError?: string } {
  const name = form.name.trim()
  const accountId = Number(form.account_id)
  const balance = Number(form.balance)
  const errors: PocketFormErrors = {}

  if (name.length < 2) errors.name = messages.nameShort
  if (!Number.isInteger(accountId) || accountId <= 0) errors.account_id = messages.selectAccount
  if (!Number.isFinite(balance) || balance < 0) errors.balance = messages.invalidBalance

  if (Object.keys(errors).length > 0) {
    return { payload: null, errors }
  }

  const currency = resolveCurrency(accountId)
  if (!currency) {
    return {
      payload: null,
      errors: { account_id: messages.invalidAccount },
      fallbackError: messages.invalidAccount,
    }
  }

  return {
    payload: {
      name,
      balance,
      account_id: accountId,
      currency,
    },
    errors,
  }
}

export function buildUpdatePocketPayload(
  form: PocketFormState,
  resolveCurrency: CurrencyResolver,
  messages: PocketValidationMessages,
): { payload: PocketUpdatePayload | null; errors: PocketFormErrors; fallbackError?: string } {
  const name = form.name.trim()
  const accountId = Number(form.account_id)
  const errors: PocketFormErrors = {}

  if (name.length < 2) errors.name = messages.nameShort
  if (!Number.isInteger(accountId) || accountId <= 0) errors.account_id = messages.selectAccount

  if (Object.keys(errors).length > 0) {
    return { payload: null, errors }
  }

  const currency = resolveCurrency(accountId)
  if (!currency) {
    return {
      payload: null,
      errors: { account_id: messages.invalidAccount },
      fallbackError: messages.invalidAccount,
    }
  }

  return {
    payload: {
      name,
      account_id: accountId,
    },
    errors,
  }
}
