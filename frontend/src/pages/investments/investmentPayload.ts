import type { InvestmentPayload, InvestmentUpdatePayload } from '@/api/investments'

export interface InvestmentFormState {
  name: string
  instrument_type: string
  amount_invested: string
  current_value: string
  currency: string
  investment_entity_id: string
  started_at: string
}

export type InvestmentFormErrors = Partial<Record<'name' | 'investment_entity_id' | 'amount_invested' | 'current_value' | 'started_at', string>>

interface InvestmentValidationMessages {
  nameShort: string
  selectEntity: string
  amountZero: string
  valueNegative: string
  selectDate: string
}

export function buildCreateInvestmentPayload(
  form: InvestmentFormState,
  messages: InvestmentValidationMessages,
): { payload: InvestmentPayload | null; errors: InvestmentFormErrors } {
  const name = form.name.trim()
  const investmentEntityId = Number(form.investment_entity_id)
  const amountInvested = Number(form.amount_invested)
  const errors: InvestmentFormErrors = {}

  if (name.length < 2) errors.name = messages.nameShort
  if (!Number.isInteger(investmentEntityId) || investmentEntityId <= 0) errors.investment_entity_id = messages.selectEntity
  if (!form.amount_invested || amountInvested <= 0) errors.amount_invested = messages.amountZero
  if (!form.started_at) errors.started_at = messages.selectDate

  if (Object.keys(errors).length > 0) {
    return { payload: null, errors }
  }

  return {
    payload: {
      name,
      instrument_type: form.instrument_type,
      amount_invested: amountInvested,
      current_value: amountInvested,
      currency: form.currency as 'COP' | 'USD',
      investment_entity_id: investmentEntityId,
      started_at: new Date(form.started_at).toISOString(),
    },
    errors,
  }
}

export function buildUpdateInvestmentPayload(
  form: InvestmentFormState,
  messages: InvestmentValidationMessages,
): { payload: InvestmentUpdatePayload | null; errors: InvestmentFormErrors } {
  const name = form.name.trim()
  const investmentEntityId = Number(form.investment_entity_id)
  const currentValue = Number(form.current_value)
  const errors: InvestmentFormErrors = {}

  if (name.length < 2) errors.name = messages.nameShort
  if (!Number.isInteger(investmentEntityId) || investmentEntityId <= 0) errors.investment_entity_id = messages.selectEntity
  if (form.current_value === '' || currentValue < 0) errors.current_value = messages.valueNegative
  if (!form.started_at) errors.started_at = messages.selectDate

  if (Object.keys(errors).length > 0) {
    return { payload: null, errors }
  }

  return {
    payload: {
      name,
      instrument_type: form.instrument_type,
      current_value: currentValue,
      investment_entity_id: investmentEntityId,
      started_at: new Date(form.started_at).toISOString(),
    },
    errors,
  }
}
