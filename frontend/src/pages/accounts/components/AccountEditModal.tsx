import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import FloatingModalFrame from '@/components/ui/FloatingModalFrame'
import Select from '@/components/ui/Select'
import type { Bank } from '@/api/banks'
import type { Account } from '@/types'

interface AccountEditModalProps {
  account: Account
  banks: Bank[]
  saving: boolean
  onSubmit: (id: number, data: { name: string; account_type: 'savings' | 'checking'; currency: 'COP' | 'USD'; bank_id: number }) => void
  onClose: () => void
}

export default function AccountEditModal({ account, banks, saving, onSubmit, onClose }: AccountEditModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(account.name)
  const [accountType, setAccountType] = useState<'savings' | 'checking'>(
    account.account_type === 'checking' ? 'checking' : 'savings',
  )
  const [currency, setCurrency] = useState<'COP' | 'USD'>(
    account.currency === 'USD' ? 'USD' : 'COP',
  )
  const [bankId, setBankId] = useState(String(account.bank_id))

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Keep minimal client-side guard before delegating full validation to backend.
    if (name.trim().length < 2 || !bankId) return
    onSubmit(account.id, {
      name: name.trim(),
      account_type: accountType,
      currency,
      bank_id: Number(bankId),
    })
  }

  return (
    <FloatingModalFrame
      title={t('accounts.edit_title')}
      subtitle={t('accounts.edit_desc')}
      onClose={onClose}
      maxWidth="max-w-2xl"
      overflow="visible"
      bodyClassName="p-0"
      icon={
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
          <path d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5zM15.71 6.29a1 1 0 000-1.41l-1.58-1.58a1 1 0 00-1.41 0l-1.24 1.24 2.99 2.99 1.24-1.24z" fill="currentColor" />
        </svg>
      }
    >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-1">
            <label className="app-label">{t('accounts.field_name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="app-control w-full"
              placeholder="Ej: Cuenta Ahorros Principal"
              autoFocus
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="app-label">Tipo</label>
              <Select
                value={accountType}
                onChange={(value) => setAccountType(value as 'savings' | 'checking')}
                options={[
                  { value: 'savings', label: t('accounts.type_savings') },
                  { value: 'checking', label: t('accounts.type_checking') },
                ]}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="app-label">Moneda</label>
              <Select
                value={currency}
                onChange={(value) => setCurrency(value as 'COP' | 'USD')}
                options={[
                  { value: 'COP', label: 'COP' },
                  { value: 'USD', label: 'USD' },
                ]}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="app-label">Banco</label>
              <Select
                value={bankId}
                onChange={setBankId}
                options={banks.map((bank) => ({ value: String(bank.id), label: `${bank.name} (${bank.country_code})` }))}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button type="submit" className="app-btn-primary" disabled={saving || name.trim().length < 2}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <button type="button" className="app-btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
    </FloatingModalFrame>
  )
}
