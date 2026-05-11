import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import FloatingModalFrame from '@/components/ui/FloatingModalFrame'
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
    <FloatingModalFrame
      title={title}
      onClose={onClose}
      maxWidth="max-w-sm"
      overflow="visible"
      bodyClassName="p-0"
      icon={
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
          <path d="M3 6h14M3 10h10M3 14h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      }
    >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
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
    </FloatingModalFrame>
  )
}
