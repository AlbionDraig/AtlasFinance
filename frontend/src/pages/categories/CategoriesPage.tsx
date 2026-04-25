import { useEffect, useState } from 'react'
import { categoriesApi, type Category, type CategoryPayload } from '@/api/categories'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import StickyBar from '@/components/ui/StickyBar'
import { useToast } from '@/hooks/useToast'

// ─── Form state ───────────────────────────────────────────────────────────────
interface FormState {
  name: string
  is_fixed: boolean
}

const EMPTY_FORM: FormState = { name: '', is_fixed: false }

// ─── Category form modal ──────────────────────────────────────────────────────
interface CategoryModalProps {
  initial: FormState
  loading: boolean
  title: string
  onSubmit: (data: FormState) => void
  onClose: () => void
}

function CategoryModal({ initial, loading, title, onSubmit, onClose }: CategoryModalProps) {
  const [form, setForm] = useState<FormState>(initial)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setError(null)
    onSubmit(form)
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div className="w-full rounded-2xl bg-white border border-neutral-100 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-sm font-medium text-neutral-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Cerrar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <FormField label="Nombre" error={error}>
            <input
              className="app-control"
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Servicios públicos"
              maxLength={120}
              autoFocus
            />
          </FormField>

          {/* Toggle is_fixed */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              role="switch"
              aria-checked={form.is_fixed}
              onClick={() => setForm(f => ({ ...f, is_fixed: !f.is_fixed }))}
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
            <span className="text-sm text-neutral-700">Gasto fijo</span>
            <span className="text-xs text-neutral-400">(arriendo, servicios, suscripciones…)</span>
          </label>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-brand text-brand hover:bg-brand-light transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const { toast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  useEffect(() => {
    categoriesApi
      .list()
      .then(r => setCategories(r.data))
      .catch(() => toast('No se pudieron cargar las categorías.', 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(data: FormState) {
    setSaving(true)
    try {
      const r = await categoriesApi.create(data)
      setCategories(prev => [r.data, ...prev])
      setShowCreate(false)
      toast('Categoría creada.', 'success')
    } catch {
      toast('No se pudo crear la categoría.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(data: FormState) {
    if (!editing) return
    setSaving(true)
    try {
      const r = await categoriesApi.update(editing.id, data)
      setCategories(prev => prev.map(c => (c.id === editing.id ? r.data : c)))
      setEditing(null)
      toast('Categoría actualizada.', 'success')
    } catch {
      toast('No se pudo actualizar la categoría.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setSaving(true)
    try {
      await categoriesApi.delete(deleting.id)
      setCategories(prev => prev.filter(c => c.id !== deleting.id))
      setDeleting(null)
      toast('Categoría eliminada.', 'success')
    } catch {
      toast('No se pudo eliminar la categoría.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const fixed = categories.filter(c => c.is_fixed)
  const variable = categories.filter(c => !c.is_fixed)

  return (
    <div className="app-shell w-full mx-auto space-y-6 max-w-[860px] rounded-2xl p-4 md:p-6">
      <StickyBar>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="app-title text-xl">Categorías</h1>
            <p className="app-subtitle text-sm mt-0.5">Organiza tus gastos e ingresos con categorías propias</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
          >
            + Nueva categoría
          </button>
        </div>
      </StickyBar>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner size={8} />
        </div>
      ) : categories.length === 0 ? (
        <div className="app-card p-10 flex flex-col items-center gap-2">
          <p className="text-neutral-700 text-sm">No tienes categorías todavía.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-2 px-4 py-2 text-sm rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
          >
            Crear primera categoría
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <CategoryGroup
            title="Gastos fijos"
            accentClass="border-t-brand"
            items={fixed}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
          <CategoryGroup
            title="Gastos variables / Ingresos"
            accentClass="border-t-success"
            items={variable}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        </div>
      )}

      {showCreate && (
        <CategoryModal
          title="Nueva categoría"
          initial={EMPTY_FORM}
          loading={saving}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editing && (
        <CategoryModal
          title="Editar categoría"
          initial={{ name: editing.name, is_fixed: editing.is_fixed }}
          loading={saving}
          onSubmit={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          title="Eliminar categoría"
          description={`¿Eliminar "${deleting.name}"? Las transacciones asociadas quedarán sin categoría.`}
          loading={saving}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

// ─── Group sub-component ──────────────────────────────────────────────────────
interface CategoryGroupProps {
  title: string
  accentClass: string
  items: Category[]
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}

function CategoryGroup({ title, accentClass, items, onEdit, onDelete }: CategoryGroupProps) {
  return (
    <div className={`app-card border-t-2 ${accentClass}`}>
      <div className="px-5 py-3 border-b border-neutral-100">
        <p className="app-label text-xs uppercase tracking-widest">{title}</p>
        <p className="text-xs text-neutral-400 mt-0.5">{items.length} categoría{items.length !== 1 ? 's' : ''}</p>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-neutral-400">Sin categorías en este grupo.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {items.map(cat => (
            <li key={cat.id} className="flex items-center justify-between px-5 py-3 gap-3">
              <span className="text-sm text-neutral-900 truncate">{cat.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onEdit(cat)}
                  aria-label={`Editar ${cat.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(cat)}
                  aria-label={`Eliminar ${cat.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-brand-light hover:text-brand-text transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
