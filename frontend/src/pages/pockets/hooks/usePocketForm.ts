import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Account, Pocket } from '@/types'
import {
  type PocketFormErrors,
  type PocketFormState,
  buildCreatePocketPayload,
  buildUpdatePocketPayload,
} from '../pocketPayload'

interface UsePocketFormParams {
  accountById: Map<number, Account>
  onValidationError: (message: string) => void
}

function buildEmptyForm(): PocketFormState {
  return {
    name: '',
    balance: '',
    account_id: '',
  }
}

export function usePocketForm({ accountById, onValidationError }: UsePocketFormParams) {
  const { t } = useTranslation()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingPocket, setEditingPocket] = useState<Pocket | null>(null)
  const [form, setForm] = useState<PocketFormState>(buildEmptyForm())
  const [formErrors, setFormErrors] = useState<PocketFormErrors>({})

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

  function prepareEdit(pocket: Pocket) {
    setEditingPocket(pocket)
    setForm({
      name: pocket.name,
      balance: String(pocket.balance),
      account_id: String(pocket.account_id),
    })
  }

  function resolveCurrency(accountId: number) {
    const account = accountById.get(accountId)
    if (!account) return null
    return account.currency as 'COP' | 'USD'
  }

  function buildCreatePayloadFromForm() {
    const { payload, errors, fallbackError } = buildCreatePocketPayload(
      form,
      resolveCurrency,
      {
        nameShort: t('pockets.toast_name_short'),
        selectAccount: t('pockets.toast_select_account'),
        invalidBalance: t('pockets.toast_balance_invalid'),
        invalidAccount: t('pockets.toast_invalid_account'),
      },
    )

    setFormErrors(errors)
    if (!payload) {
      const firstError = errors.name ?? errors.account_id ?? errors.balance ?? fallbackError
      if (firstError) onValidationError(firstError)
      return null
    }

    return payload
  }

  function buildUpdatePayloadFromForm() {
    const { payload, errors, fallbackError } = buildUpdatePocketPayload(
      form,
      resolveCurrency,
      {
        nameShort: t('pockets.toast_name_short'),
        selectAccount: t('pockets.toast_select_account'),
        invalidBalance: t('pockets.toast_balance_invalid'),
        invalidAccount: t('pockets.toast_invalid_account'),
      },
    )

    setFormErrors(errors)
    if (!payload) {
      const firstError = errors.name ?? errors.account_id ?? fallbackError
      if (firstError) onValidationError(firstError)
      return null
    }

    return payload
  }

  return {
    createOpen,
    setCreateOpen,
    editingPocket,
    setEditingPocket,
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
