import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { pocketsApi } from '@/api/pockets'
import { transactionsApi } from '@/api/transactions'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import type { ToastOptions, ToastVariant } from '@/hooks/useToast'
import { downloadBlobFile } from '@/lib/download'
import { invalidateQueryKeys } from '@/lib/reactQuery'
import { getApiErrorMessage } from '@/lib/utils'
import { trackUxEvent } from '@/lib/uxTelemetry'
import type { Account, Transaction } from '@/types'
import { buildTransactionPayload, type TransactionFormErrors } from '../transactionPayload'
import type { FiltersState, FormState } from '../types'

const UNDO_WINDOW_MS = 5000

export interface TransferForm {
  fromAccountId: string
  toAccountId: string
  amount: string
  occurredDate: string
  occurredTime: string
}

export interface MoveToPocketForm {
  accountId: string
  pocketId: string
  amount: string
  occurredDate: string
  occurredTime: string
}

interface UseTransactionsActionsParams {
  transactions: Transaction[]
  filters: FiltersState
  derivedRange: { from: string; to: string }
  queryClient: QueryClient
  form: FormState
  selectedAccount: Account | null
  editingId: number | null
  validate: () => TransactionFormErrors
  setFormErrors: React.Dispatch<React.SetStateAction<TransactionFormErrors>>
  resetForm: () => void
  setTransferOpen: (open: boolean) => void
  setMoveToPocketOpen: (open: boolean) => void
  toast: (message: string, variant?: ToastVariant, options?: ToastOptions) => void
  t: (key: string) => string
}

export interface TransactionsActionsResult {
  saving: boolean
  exporting: boolean
  deletingId: number | null
  pendingDeleteId: number | null
  pendingDeletedCount: number
  setPendingDeleteId: React.Dispatch<React.SetStateAction<number | null>>
  visibleTransactions: Transaction[]
  handleExportCSV: () => Promise<void>
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  handleTransfer: (transferForm: TransferForm) => Promise<void>
  handleMoveToPocket: (moveForm: MoveToPocketForm) => Promise<void>
  handleDelete: (transactionId: number) => Promise<void>
}

function buildExportParams(filters: FiltersState, derivedRange: { from: string; to: string }) {
  return {
    start_date: derivedRange.from ? `${derivedRange.from}T00:00:00` : undefined,
    end_date: derivedRange.to ? `${derivedRange.to}T23:59:59` : undefined,
    account_id: filters.accountId !== 'all' ? Number(filters.accountId) : undefined,
    transaction_type: filters.transactionType !== 'all' ? filters.transactionType.toLowerCase() : undefined,
    currency: filters.currency !== 'all' ? filters.currency : undefined,
  }
}

export function useTransactionsActions({
  transactions,
  filters,
  derivedRange,
  queryClient,
  form,
  selectedAccount,
  editingId,
  validate,
  setFormErrors,
  resetForm,
  setTransferOpen,
  setMoveToPocketOpen,
  toast,
  t,
}: UseTransactionsActionsParams): TransactionsActionsResult {
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [pendingDeletedIds, setPendingDeletedIds] = useState<Set<number>>(new Set())
  const pendingDeleteTimeoutsRef = useRef<Map<number, number>>(new Map())

  const visibleTransactions = useMemo(
    () => transactions.filter((tx) => !pendingDeletedIds.has(tx.id)),
    [transactions, pendingDeletedIds],
  )

  useEffect(() => {
    if (pendingDeletedIds.size === 0) return
    const existingIds = new Set(transactions.map((tx) => tx.id))
    setPendingDeletedIds((current) => {
      let changed = false
      const next = new Set<number>()
      current.forEach((id) => {
        if (existingIds.has(id)) {
          next.add(id)
        } else {
          changed = true
        }
      })
      return changed ? next : current
    })
  }, [transactions, pendingDeletedIds.size])

  useEffect(() => {
    return () => {
      pendingDeleteTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      pendingDeleteTimeoutsRef.current.clear()
    }
  }, [])

  async function handleExportCSV() {
    setExporting(true)
    try {
      const response = await transactionsApi.export(buildExportParams(filters, derivedRange))
      downloadBlobFile(new Blob([response.data], { type: 'text/csv' }), 'transactions.csv')
    } catch (exportError) {
      toast(getApiErrorMessage(exportError, t('transactions.toast_export_error')), 'error')
    } finally {
      setExporting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validate()
    setFormErrors(errors)
    if (Object.keys(errors).length) {
      trackUxEvent('transactions_validation_failed', {
        errorCount: Object.keys(errors).length,
        hasAccountError: Boolean(errors.accountId),
        hasAmountError: Boolean(errors.amount),
        hasCategoryError: Boolean(errors.categoryId),
      })
      const firstError = Object.values(errors)[0]
      if (firstError) {
        toast(firstError, 'error')
      }
      return
    }

    if (!selectedAccount) {
      toast(t('transactions.toast_no_account'), 'error')
      return
    }

    setSaving(true)
    try {
      const payload = buildTransactionPayload(form, selectedAccount)
      if (editingId != null) {
        await transactionsApi.update(editingId, payload)
        toast(t('transactions.toast_updated'))
      } else {
        await transactionsApi.create(payload)
        toast(t('transactions.toast_saved'))
      }
      resetForm()
      await invalidateQueryKeys(queryClient, [QUERY_KEYS.transactions, QUERY_KEYS.accounts, QUERY_KEYS.pockets])
    } catch (submitError) {
      toast(getApiErrorMessage(submitError, t('transactions.toast_save_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTransfer(transferForm: TransferForm) {
    setSaving(true)
    try {
      await transactionsApi.transfer({
        from_account_id: Number(transferForm.fromAccountId),
        to_account_id: Number(transferForm.toAccountId),
        amount: Number(transferForm.amount),
        occurred_at: `${transferForm.occurredDate}T${transferForm.occurredTime}:00`,
      })
      toast(t('transactions.toast_transfer_ok'))
      setTransferOpen(false)
      await invalidateQueryKeys(queryClient, [QUERY_KEYS.transactions, QUERY_KEYS.accounts])
    } catch (transferError) {
      toast(getApiErrorMessage(transferError, t('transactions.toast_transfer_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleMoveToPocket(moveForm: MoveToPocketForm) {
    setSaving(true)
    try {
      await pocketsApi.moveFunds({
        amount: Number(moveForm.amount),
        account_id: Number(moveForm.accountId),
        pocket_id: Number(moveForm.pocketId),
        occurred_at: `${moveForm.occurredDate}T${moveForm.occurredTime}:00`,
      })
      setMoveToPocketOpen(false)
      toast(t('transactions.toast_pocket_ok'))
      await invalidateQueryKeys(queryClient, [QUERY_KEYS.transactions, QUERY_KEYS.accounts, QUERY_KEYS.pockets])
    } catch (moveError) {
      toast(getApiErrorMessage(moveError, t('transactions.toast_pocket_error')), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(transactionId: number) {
    setDeletingId(null)
    setPendingDeleteId(null)
    trackUxEvent('transactions_delete_requested', { transactionId })

    setPendingDeletedIds((current) => {
      const next = new Set(current)
      next.add(transactionId)
      return next
    })

    const timeoutId = window.setTimeout(async () => {
      pendingDeleteTimeoutsRef.current.delete(transactionId)
      setDeletingId(transactionId)
      try {
        await transactionsApi.delete(transactionId)
        if (editingId === transactionId) {
          resetForm()
        }
        await invalidateQueryKeys(queryClient, [QUERY_KEYS.transactions, QUERY_KEYS.accounts, QUERY_KEYS.pockets])
      } catch (deleteError) {
        setPendingDeletedIds((current) => {
          const next = new Set(current)
          next.delete(transactionId)
          return next
        })
        toast(getApiErrorMessage(deleteError, t('transactions.toast_delete_error')), 'error')
      } finally {
        setDeletingId(null)
      }
    }, UNDO_WINDOW_MS)

    pendingDeleteTimeoutsRef.current.set(transactionId, timeoutId)
    toast(t('transactions.toast_deleted'), 'success', {
      actionLabel: t('common.undo'),
      onAction: () => {
        trackUxEvent('transactions_delete_undo', { transactionId })
        const pendingTimeoutId = pendingDeleteTimeoutsRef.current.get(transactionId)
        if (pendingTimeoutId != null) {
          window.clearTimeout(pendingTimeoutId)
          pendingDeleteTimeoutsRef.current.delete(transactionId)
          setPendingDeletedIds((current) => {
            const next = new Set(current)
            next.delete(transactionId)
            return next
          })
        }
      },
    })
  }

  return {
    saving,
    exporting,
    deletingId,
    pendingDeleteId,
    pendingDeletedCount: pendingDeletedIds.size,
    setPendingDeleteId,
    visibleTransactions,
    handleExportCSV,
    handleSubmit,
    handleTransfer,
    handleMoveToPocket,
    handleDelete,
  }
}