import type { Dispatch, FormEvent, SetStateAction } from 'react'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import type { Bank } from '@/api/banks'

interface AccountFormState {
  name: string
  accountType: 'savings' | 'checking' | ''
  currency: 'COP' | 'USD' | ''
  bankId: string
}

interface AccountCreateModalProps {
  form: AccountFormState
  setForm: Dispatch<SetStateAction<AccountFormState>>
  banks: Bank[]
  saving: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

export default function AccountCreateModal({
  form,
  setForm,
  banks,
  saving,
  onSubmit,
  onClose,
}: AccountCreateModalProps) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <div className="w-full rounded-2xl bg-white border border-neutral-100 shadow-xl overflow-hidden border-t-4 border-t-brand">
        <div className="bg-brand-light border-b border-brand/10 px-6 py-4 flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="app-section-title text-brand-text">Crear cuenta</h2>
            <p className="text-sm text-neutral-700 mt-0.5">Registra una nueva cuenta para empezar a mover dinero.</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className="ml-auto -mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="app-label">Nombre de cuenta</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="app-control w-full"
              placeholder="Ej: Cuenta Ahorros Principal"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="app-label">Tipo</label>
              <Select
                value={form.accountType}
                onChange={(value) => setForm((current) => ({ ...current, accountType: value as 'savings' | 'checking' | '' }))}
                options={[
                  { value: '', label: 'Selecciona un tipo' },
                  { value: 'savings', label: 'Ahorros' },
                  { value: 'checking', label: 'Corriente' },
                ]}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="app-label">Moneda</label>
              <Select
                value={form.currency}
                onChange={(value) => setForm((current) => ({ ...current, currency: value as 'COP' | 'USD' | '' }))}
                options={[
                  { value: '', label: 'Selecciona una moneda' },
                  { value: 'COP', label: 'COP' },
                  { value: 'USD', label: 'USD' },
                ]}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="app-label">Banco</label>
              <Select
                value={form.bankId}
                onChange={(value) => setForm((current) => ({ ...current, bankId: value }))}
                options={[
                  { value: '', label: banks.length ? 'Selecciona un banco' : 'Sin bancos' },
                  ...banks.map((bank) => ({ value: String(bank.id), label: `${bank.name} (${bank.country_code})` })),
                ]}
                className="w-full"
                disabled={!banks.length}
              />
            </div>
          </div>

          {!banks.length && (
            <p className="text-sm text-warning-text bg-warning-bg rounded-lg px-3 py-2">
              No hay bancos disponibles. Crea bancos desde Administracion.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button type="submit" className="app-btn-primary" disabled={saving || !banks.length}>
              {saving ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
            <button type="button" className="app-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
