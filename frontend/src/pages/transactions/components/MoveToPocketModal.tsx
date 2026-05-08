import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import TimePicker from '@/components/ui/TimePicker'
import { useToast } from '@/hooks/useToast'
import type { Account, Pocket } from '@/types'

interface MoveToPocketForm {
  accountId: string
  pocketId: string
  amount: string
  occurredDate: string
  occurredTime: string
}

type MoveToPocketFormErrors = Partial<Record<keyof MoveToPocketForm, string>>

interface MoveToPocketModalProps {
  accounts: Account[]
  pockets: Pocket[]
  saving: boolean
  maxDate: string
  onSubmit: (form: MoveToPocketForm) => Promise<void>
  onClose: () => void
}

function buildDefault(): MoveToPocketForm {
  return {
    accountId: '',
    pocketId: '',
    amount: '',
    occurredDate: '',
    occurredTime: '',
  }
}

export default function MoveToPocketModal({
  accounts,
  pockets,
  saving,
  maxDate,
  onSubmit,
  onClose,
}: MoveToPocketModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [form, setForm] = useState<MoveToPocketForm>(buildDefault)
  const [errors, setErrors] = useState<MoveToPocketFormErrors>({})

  const account = accounts.find((item) => String(item.id) === form.accountId) ?? null
  const selectedPocket = pockets.find((item) => String(item.id) === form.pocketId) ?? null
  const accountPockets = useMemo(() => {
    // Restrict destination options to pockets owned by selected account.
    if (!account) return []
    return pockets.filter((pocket) => pocket.account_id === account.id)
  }, [account, pockets])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: MoveToPocketFormErrors = {}
    if (!form.accountId) nextErrors.accountId = t('transactions.toast_pocket_select_account')
    if (!form.pocketId) nextErrors.pocketId = t('transactions.toast_pocket_select_pocket')
    const amount = Number(form.amount)
    if (Number.isNaN(amount) || amount <= 0) nextErrors.amount = t('transactions.toast_pocket_amount_zero')
    if (!form.occurredDate) nextErrors.occurredDate = t('transactions.toast_pocket_select_date')
    if (!form.occurredTime) nextErrors.occurredTime = t('transactions.toast_pocket_select_time')

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
        <div className="flex items-start gap-3 border-b border-brand/10 bg-brand-light px-6 py-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M11 7l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 6h5M4 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
            </svg>
          </div>
          <div>
            <h2 className="app-section-title text-brand-text">{t('transactions.pocket_title')}</h2>
            <p className="text-sm text-neutral-700 mt-0.5">{t('transactions.pocket_desc')}</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="app-label">{t('transactions.pocket_field_account')}</label>
            <Select
              value={form.accountId}
              onChange={(value) => {
                setForm((prev) => ({ ...prev, accountId: value, pocketId: '' }))
                setErrors((current) => ({ ...current, accountId: undefined, pocketId: undefined }))
              }}
              options={[
                { value: '', label: t('transactions.pocket_select_account') },
                ...accounts.map((item) => ({
                  value: String(item.id),
                  label: `${item.name} (${item.currency})`,
                })),
              ]}
              className="w-full"
            />
            {errors.accountId && <p className="mt-1 text-xs tone-negative">{errors.accountId}</p>}
          </div>

          <div className="space-y-1">
            <label className="app-label">{t('transactions.pocket_field_pocket')}</label>
            <Select
              value={form.pocketId}
              onChange={(value) => {
                setForm((prev) => ({ ...prev, pocketId: value }))
                setErrors((current) => ({ ...current, pocketId: undefined }))
              }}
              options={[
                {
                  value: '',
                  label: form.accountId
                    ? accountPockets.length
                      ? t('transactions.pocket_select_pocket')
                      : t('transactions.pocket_no_pockets')
                    : t('pockets.field_account_select'),
                },
                ...accountPockets.map((pocket) => ({
                  value: String(pocket.id),
                  label: `${pocket.name} (${pocket.currency})`,
                })),
              ]}
              className="w-full"
              disabled={!form.accountId || !accountPockets.length}
            />
            {errors.pocketId && <p className="mt-1 text-xs tone-negative">{errors.pocketId}</p>}
          </div>

          <div className="space-y-1">
            <label className="app-label">{t('common.amount')}</label>
            <AmountInput
              value={form.amount}
              onChange={(raw) => {
                setForm((prev) => ({ ...prev, amount: raw }))
                setErrors((current) => ({ ...current, amount: undefined }))
              }}
              currency={account?.currency ?? 'COP'}
              className="w-full"
            />
            {errors.amount && <p className="mt-1 text-xs tone-negative">{errors.amount}</p>}
          </div>

          <div className="space-y-1">
            <label className="app-label">Descripción</label>
            <p className="app-control w-full min-h-11 flex items-center text-neutral-700">
              {selectedPocket ? `Movimiento a Bolsillo ${selectedPocket.name}` : 'Movimiento a Bolsillo {Bolsillo}'}
            </p>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button type="submit" className="app-btn-primary" disabled={saving}>
              {saving ? t('transactions.pocket_submitting') : t('transactions.pocket_submit')}
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
