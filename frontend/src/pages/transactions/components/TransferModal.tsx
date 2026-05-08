import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import TimePicker from '@/components/ui/TimePicker'
import { useToast } from '@/hooks/useToast'
import type { Account } from '@/types'

interface TransferForm {
  fromAccountId: string
  toAccountId: string
  amount: string
  occurredDate: string
  occurredTime: string
}

type TransferFormErrors = Partial<Record<keyof TransferForm, string>>

interface TransferModalProps {
  accounts: Account[]
  saving: boolean
  maxDate: string
  onSubmit: (form: TransferForm) => Promise<void>
  onClose: () => void
}

function buildDefault(): TransferForm {
  return {
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    occurredDate: '',
    occurredTime: '',
  }
}

export default function TransferModal({
  accounts,
  saving,
  maxDate,
  onSubmit,
  onClose,
}: TransferModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [form, setForm] = useState<TransferForm>(buildDefault)
  const [errors, setErrors] = useState<TransferFormErrors>({})

  const fromAccount = accounts.find((a) => String(a.id) === form.fromAccountId) ?? null
  const toAccount = accounts.find((a) => String(a.id) === form.toAccountId) ?? null
  const currency = fromAccount?.currency ?? null

  // Destination accounts must be different and share the origin currency.
  const eligibleDestinations = accounts.filter(
    (a) => String(a.id) !== form.fromAccountId && (!currency || a.currency === currency),
  )

  const autoDescription = fromAccount && toAccount
    ? `Transferencia: ${fromAccount.name} a ${toAccount.name}`
    : 'Transferencia: origen a destino'

  function handleFromChange(value: string) {
    setForm((prev) => ({
      ...prev,
      fromAccountId: value,
      // Reset destination if new origin makes current destination invalid by currency.
      toAccountId:
        prev.toAccountId && accounts.find((a) => String(a.id) === prev.toAccountId)?.currency !==
          accounts.find((a) => String(a.id) === value)?.currency
          ? ''
          : prev.toAccountId,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: TransferFormErrors = {}
    if (!form.fromAccountId) nextErrors.fromAccountId = t('transactions.toast_transfer_select_from')
    if (!form.toAccountId) nextErrors.toAccountId = t('transactions.toast_transfer_select_to')
    if (form.fromAccountId && form.fromAccountId === form.toAccountId) {
      nextErrors.toAccountId = t('transactions.toast_transfer_same_account')
    }
    const amount = Number(form.amount)
    if (Number.isNaN(amount) || amount <= 0) nextErrors.amount = t('transactions.toast_transfer_amount_zero')
    if (!form.occurredDate) nextErrors.occurredDate = t('transactions.toast_transfer_select_date')
    if (!form.occurredTime) nextErrors.occurredTime = t('transactions.toast_transfer_select_time')

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      const firstError = Object.values(nextErrors)[0]
      if (firstError) {
        toast(firstError, 'error')
      }
      return
    }

    await onSubmit(form)
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="w-full rounded-2xl border border-neutral-100 border-t-4 border-t-brand bg-white shadow-xl overflow-visible">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-brand/10 bg-brand-light px-6 py-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M3 10h14M13 6l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 14l-4-4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="app-section-title text-brand-text">{t('transactions.transfer_title')}</h2>
            <p className="text-sm text-neutral-700 mt-0.5">{t('transactions.transfer_desc')}</p>
          </div>
          <button
            type="button"
            aria-label={t('common.close')}
            className="ml-auto -mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Origin */}
          <div className="space-y-1">
            <label className="app-label">{t('transactions.transfer_field_from')}</label>
            <Select
              value={form.fromAccountId}
              onChange={(value) => {
                handleFromChange(value)
                setErrors((current) => ({ ...current, fromAccountId: undefined, toAccountId: undefined }))
              }}
              options={[
                { value: '', label: t('transactions.transfer_select_from') },
                ...accounts.map((a) => ({
                  value: String(a.id),
                  label: `${a.name} (${a.currency})`,
                })),
              ]}
              className="w-full"
              disabled={!accounts.length}
            />
            {errors.fromAccountId && <p className="mt-1 text-xs tone-negative">{errors.fromAccountId}</p>}
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <label className="app-label">{t('transactions.transfer_field_to')}</label>
            <Select
              value={form.toAccountId}
              onChange={(value) => {
                setForm((prev) => ({ ...prev, toAccountId: value }))
                setErrors((current) => ({ ...current, toAccountId: undefined }))
              }}
              options={[
                {
                  value: '',
                  label: form.fromAccountId
                    ? eligibleDestinations.length
                      ? t('transactions.transfer_select_to')
                      : `${t('common.noResults')} ${currency ?? ''}`
                    : t('transactions.transfer_select_from'),
                },
                ...eligibleDestinations.map((a) => ({
                  value: String(a.id),
                  label: `${a.name} (${a.currency})`,
                })),
              ]}
              className="w-full"
              disabled={!form.fromAccountId || eligibleDestinations.length === 0}
            />
            {errors.toAccountId && <p className="mt-1 text-xs tone-negative">{errors.toAccountId}</p>}
          </div>

          <div className="space-y-1">
            <label className="app-label">{t('common.amount')}</label>
            <AmountInput
              value={form.amount}
              onChange={(raw) => {
                setForm((prev) => ({ ...prev, amount: raw }))
                setErrors((current) => ({ ...current, amount: undefined }))
              }}
              currency={currency ?? 'COP'}
              className="w-full"
            />
            {errors.amount && <p className="mt-1 text-xs tone-negative">{errors.amount}</p>}
          </div>

          <div className="space-y-1">
            <label className="app-label">{t('common.description', 'Descripción')}</label>
            <p className="app-control w-full min-h-11 flex items-center text-neutral-700">
              {autoDescription}
            </p>
          </div>

          {/* Date / time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <DatePicker
                label={t('common.date')}
                value={form.occurredDate}
                onChange={(value) => {
                  setForm((prev) => ({ ...prev, occurredDate: value }))
                  setErrors((current) => ({ ...current, occurredDate: undefined }))
                }}
                max={maxDate}
                className="w-full"
              />
              {errors.occurredDate && <p className="text-xs tone-negative">{errors.occurredDate}</p>}
            </div>
            <div className="space-y-1">
              <TimePicker
                label={t('common.time')}
                value={form.occurredTime}
                onChange={(value) => {
                  setForm((prev) => ({ ...prev, occurredTime: value }))
                  setErrors((current) => ({ ...current, occurredTime: undefined }))
                }}
                className="w-full"
              />
              {errors.occurredTime && <p className="text-xs tone-negative">{errors.occurredTime}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button type="submit" className="app-btn-primary" disabled={saving}>
              {saving ? t('transactions.transfer_submitting') : t('transactions.transfer_submit')}
            </button>
            <button type="button" className="app-btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
