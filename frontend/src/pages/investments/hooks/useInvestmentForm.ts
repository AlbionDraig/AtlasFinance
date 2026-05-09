import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { INSTRUMENT_TYPES } from '@/api/investments'
import type { Investment } from '@/types'
import {
  type InvestmentFormErrors,
  type InvestmentFormState,
  buildCreateInvestmentPayload,
  buildUpdateInvestmentPayload,
} from '../investmentPayload'

interface UseInvestmentFormParams {
  onValidationError: (message: string) => void
}

function buildEmptyForm(): InvestmentFormState {
  return {
    name: '',
    instrument_type: INSTRUMENT_TYPES[0],
    amount_invested: '',
    current_value: '',
    currency: 'COP',
    investment_entity_id: '',
    started_at: new Date().toISOString().slice(0, 10),
  }
}

export function useInvestmentForm({ onValidationError }: UseInvestmentFormParams) {
  const { t } = useTranslation()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [form, setForm] = useState<InvestmentFormState>(buildEmptyForm())
  const [formErrors, setFormErrors] = useState<InvestmentFormErrors>({})

  function resetForm() {
    setForm(buildEmptyForm())
    setFormErrors({})
  }

  function openCreateModal() {
    resetForm()
    setCreateOpen(true)
  }

  function closeCreateModal() {
    setCreateOpen(false)
    resetForm()
  }

  function prepareEdit(investment: Investment) {
    setForm({
      name: investment.name,
      instrument_type: investment.instrument_type,
      amount_invested: String(investment.amount_invested),
      current_value: String(investment.current_value),
      currency: investment.currency,
      investment_entity_id: String(investment.investment_entity_id),
      started_at: investment.started_at.slice(0, 10),
    })
    setFormErrors({})
    setEditingInvestment(investment)
  }

  function buildCreatePayloadFromForm() {
    const { payload, errors } = buildCreateInvestmentPayload(form, {
      nameShort: t('investments.toast_name_short'),
      selectEntity: t('investments.toast_select_entity'),
      amountZero: t('investments.toast_amount_zero'),
      valueNegative: t('investments.toast_value_negative'),
      selectDate: t('investments.toast_select_date'),
    })
    setFormErrors(errors)

    if (!payload) {
      const firstError = errors.name ?? errors.investment_entity_id ?? errors.amount_invested ?? errors.started_at
      if (firstError) onValidationError(firstError)
      return null
    }

    return payload
  }

  function buildUpdatePayloadFromForm() {
    const { payload, errors } = buildUpdateInvestmentPayload(form, {
      nameShort: t('investments.toast_name_short'),
      selectEntity: t('investments.toast_select_entity'),
      amountZero: t('investments.toast_amount_zero'),
      valueNegative: t('investments.toast_value_negative'),
      selectDate: t('investments.toast_select_date'),
    })
    setFormErrors(errors)

    if (!payload) {
      const firstError = errors.name ?? errors.investment_entity_id ?? errors.current_value ?? errors.started_at
      if (firstError) onValidationError(firstError)
      return null
    }

    return payload
  }

  return {
    createOpen,
    setCreateOpen,
    editingInvestment,
    setEditingInvestment,
    form,
    setForm,
    formErrors,
    openCreateModal,
    closeCreateModal,
    prepareEdit,
    resetForm,
    buildCreatePayloadFromForm,
    buildUpdatePayloadFromForm,
  }
}
