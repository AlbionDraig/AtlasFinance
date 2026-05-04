import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import AmountInput from '@/components/ui/AmountInput'
import DatePicker from '@/components/ui/DatePicker'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import TimePicker from '@/components/ui/TimePicker'
import { useToast } from '@/hooks/useToast'
import type { Pocket } from '@/types'

interface WithdrawForm {
  pocketId: string
  amount: string
  occurredDate: string
  occurredTime: string
}

export interface WithdrawFromPocketFormData {
  pocketId: string
  amount: string
  occurredDate: string
  occurredTime: string
}

interface WithdrawFromPocketModalProps {
  pockets: Pocket[]
  saving: boolean
  maxDate: string
  onSubmit: (form: WithdrawFromPocketFormData) => Promise<void>
  onClose: () => void
}

function buildDefault(): WithdrawForm {
  return {
    pocketId: '',
    amount: '',
    occurredDate: '',
    occurredTime: '',
  }
}

export default function WithdrawFromPocketModal({
  pockets,
  saving,
  maxDate,
  onSubmit,
  onClose,
}: WithdrawFromPocketModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [form, setForm] = useState<WithdrawForm>(buildDefault)

  const selectedPocket = pockets.find((p) => String(p.id) === form.pocketId) ?? null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.pocketId) {
      toast(t('pockets.toast_withdraw_select_pocket'), 'error')
      return
    }
    const amount = Number(form.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      toast(t('pockets.toast_withdraw_amount_zero'), 'error')
      return
    }
    if (selectedPocket && amount > selectedPocket.balance) {
      toast(t('pockets.toast_withdraw_exceeds_balance'), 'error')
      return
    }
    if (!form.occurredDate) {
      toast(t('pockets.toast_withdraw_select_date'), 'error')
      return
    }
    if (!form.occurredTime) {
      toast(t('pockets.toast_withdraw_select_time'), 'error')
      return
    }

    await onSubmit(form)
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl w-full border border-neutral-100 overflow-visible">
        <div className="bg-success-bg border-b border-success/10 px-6 py-4 flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success text-white shadow-[0_0_0_5px_rgba(15,122,85,0.10)]">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M16 10H4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M9 7l-3 3 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 6h-5M16 14h-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
            </svg>
          </div>
          <div>
            <h2 className="app-section-title text-success-text">{t('pockets.withdraw_title')}</h2>
            <p className="text-sm text-neutral-700 mt-0.5">{t('pockets.withdraw_desc')}</p>
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
            <label className="app-label">{t('pockets.withdraw_field_pocket')}</label>
            <Select
              value={form.pocketId}
              onChange={(value) => setForm((prev) => ({ ...prev, pocketId: value, amount: '' }))}
              options={[
                { value: '', label: t('pockets.withdraw_select_pocket') },
                ...pockets.map((pocket) => ({
                  value: String(pocket.id),
                  label: `${pocket.name} · ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: pocket.currency, maximumFractionDigits: 0 }).format(pocket.balance)}`,
                })),
              ]}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="app-label">{t('common.amount')}</label>
            <AmountInput
              value={form.amount}
              onChange={(raw) => setForm((prev) => ({ ...prev, amount: raw }))}
              currency={selectedPocket?.currency ?? 'COP'}
              className="w-full"
            />
            {selectedPocket && (
              <p className="text-xs text-neutral-400 mt-1">
                {t('pockets.field_current_balance')}: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: selectedPocket.currency, maximumFractionDigits: 0 }).format(selectedPocket.balance)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label={t('common.date')}
              value={form.occurredDate}
              onChange={(value) => setForm((prev) => ({ ...prev, occurredDate: value }))}
              max={maxDate}
              className="w-full"
            />
            <TimePicker
              label={t('common.time')}
              value={form.occurredTime}
              onChange={(value) => setForm((prev) => ({ ...prev, occurredTime: value }))}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button type="submit" className="app-btn-primary" disabled={saving}>
              {saving ? t('pockets.withdraw_submitting') : t('pockets.withdraw_submit')}
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
