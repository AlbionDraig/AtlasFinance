import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'

export interface FormState {
  name: string
  is_fixed: boolean
  description: string
}

interface CategoryModalProps {
  initial: FormState
  loading: boolean
  title: string
  onSubmit: (data: FormState) => void
  onClose: () => void
}

export default function CategoryModal({ initial, loading, title, onSubmit, onClose }: CategoryModalProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(initial)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(t('categories.field_name_error'))
      return
    }
    setError(null)
    onSubmit(form)
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div className="w-full rounded-2xl bg-white border border-neutral-100 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-sm font-medium text-neutral-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label={t('common.close')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <FormField label={t('categories.field_name')} error={error}>
            <input
              className="app-control"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('categories.field_name_placeholder')}
              maxLength={120}
              autoFocus
            />
          </FormField>

          <FormField label={t('categories.field_description_label')}>
            <textarea
              className="app-control h-auto py-2 resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={t('categories.field_description_placeholder')}
              maxLength={300}
            />
          </FormField>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              role="switch"
              aria-checked={form.is_fixed}
              onClick={() => setForm((f) => ({ ...f, is_fixed: !f.is_fixed }))}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                form.is_fixed ? 'bg-brand' : 'bg-neutral-100'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.is_fixed ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-sm text-neutral-700">{t('categories.toggle_fixed')}</span>
            <span className="text-xs text-neutral-400">{t('categories.toggle_fixed_hint')}</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="app-btn-primary"
            >
              {loading ? t('categories.submitting') : t('categories.submit_save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="app-btn-secondary"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
