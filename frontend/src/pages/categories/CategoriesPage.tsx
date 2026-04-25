import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { categoriesApi, type Category, type CategoryPayload } from '@/api/categories'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import FilterCard from '@/components/ui/FilterCard'
import SearchInput from '@/components/ui/SearchInput'
import EditButton from '@/components/ui/EditButton'
import DeleteButton from '@/components/ui/DeleteButton'
import { useToast } from '@/hooks/useToast'


// ─── Tipos ────────────────────────────────────────────────────────────────────
interface FormState {
  name: string
  is_fixed: boolean
  description: string
}

const EMPTY_FORM: FormState = { name: '', is_fixed: false, description: '' }

// ─── Modal de formulario ──────────────────────────────────────────────────────
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

          <FormField label="¿Cuándo usarla? (opcional)">
            <textarea
              className="app-control h-auto py-2 resize-none"
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ej: pagos mensuales, recibos, facturas fijas…"
              maxLength={300}
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
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const { toast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [query, setQuery] = useState('')

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
      const payload: CategoryPayload = { name: data.name, is_fixed: data.is_fixed, description: data.description || null }
      const r = await categoriesApi.create(payload)
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
      const payload: CategoryPayload = { name: data.name, is_fixed: data.is_fixed, description: data.description || null }
      const r = await categoriesApi.update(editing.id, payload)
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? categories.filter(c => {
          const description = c.description?.toLowerCase() ?? ''
          return c.name.toLowerCase().includes(q) || description.includes(q)
        })
      : categories
  }, [categories, query])

  const activeFilters = useMemo(() => {
    const q = query.trim()
    return q ? [`Busqueda: ${q}`] : []
  }, [query])

  const fixed = filtered.filter(c => c.is_fixed)
  const variable = filtered.filter(c => !c.is_fixed)

  if (loading) {
    return (
      <div className="app-panel p-6 flex min-h-72 items-center justify-center">
        <LoadingSpinner text="Cargando categorías…" />
      </div>
    )
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[860px] p-4 md:p-6 pb-20">
      {/* Título */}
      <div>
        <h1 className="app-title text-xl">Categorías</h1>
        <p className="app-subtitle text-sm mt-0.5">Organiza tus gastos e ingresos con categorías propias</p>
      </div>

      {/* Buscador */}
      <FilterCard sticky activeFilters={activeFilters} onReset={() => setQuery('')}>
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <label className="app-label">Buscar</label>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre de categoría…"
          />
        </div>
      </FilterCard>

      {/* Contenido */}
      {categories.length === 0 ? (
        <div className="app-card flex flex-col items-center gap-3 p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
            <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M11 7h6M7 12h.01M11 12h6M7 17h.01M11 17h6" />
            </svg>
          </div>
          <p className="text-sm text-neutral-700">No tienes categorías todavía.</p>
          <p className="text-xs text-neutral-400">Crea tu primera categoría usando el botón de abajo.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="app-card flex flex-col items-center gap-3 p-10">
          <svg className="h-8 w-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <p className="text-sm text-neutral-700">Sin resultados para <span className="font-medium">"{query}"</span></p>
          <button type="button" onClick={() => setQuery('')} className="text-xs text-brand hover:underline">Limpiar búsqueda</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <CategoryGroup
            title="Gastos fijos"
            subtitle="Montos constantes mes a mes"
            accentClass="border-t-brand"
            headerBg="[background:var(--af-accent-soft)]"
            titleColor="[color:var(--af-accent-soft-text)]"
            badgeColor="bg-white/60 [color:var(--af-accent-soft-text)]"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            items={fixed}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
          <CategoryGroup
            title="Variables / Ingresos"
            subtitle="Gastos fluctuantes e ingresos"
            accentClass="border-t-success"
            headerBg="[background:var(--af-positive-soft)]"
            titleColor="[color:var(--af-positive-soft-text)]"
            badgeColor="bg-white/60 [color:var(--af-positive-soft-text)]"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            items={variable}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        </div>
      )}

      {/* Modales */}
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
          initial={{ name: editing.name, is_fixed: editing.is_fixed, description: editing.description ?? '' }}
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

      {/* FAB */}
      {!showCreate && !editing && !deleting && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva categoría
        </button>
      )}
    </div>
  )
}

// ─── Sub-componente de grupo ─────────────────────────────────────────────────
interface CategoryGroupProps {
  title: string
  subtitle: string
  accentClass: string
  headerBg: string
  titleColor: string
  badgeColor: string
  icon: ReactNode
  items: Category[]
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}

function CategoryGroup({ title, subtitle, accentClass, headerBg, titleColor, badgeColor, icon, items, onEdit, onDelete }: CategoryGroupProps) {
  return (
    <div className={`app-card border-t-2 ${accentClass} overflow-hidden`}>
      <div className={`${headerBg} px-5 py-4 border-b border-neutral-100`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/70 ${titleColor}`}>
              {icon}
            </span>
            <div>
              <p className={`text-sm font-medium ${titleColor}`}>{title}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
            <span className={`shrink-0 mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full border border-black/5 ${badgeColor}`}>
            {items.length} categor{items.length !== 1 ? 'ías' : 'ía'}
          </span>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-5 text-sm text-neutral-400">Sin categorías en este grupo.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {items.map(cat => (
            <li key={cat.id} className="flex items-center justify-between px-4 py-2.5 gap-3 hover:bg-neutral-50 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-900 truncate">{cat.name}</p>
                {cat.description && (
                  <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1 leading-relaxed">{cat.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <EditButton onClick={() => onEdit(cat)} label={`Editar ${cat.name}`} />
                <DeleteButton onClick={() => onDelete(cat)} label={`Eliminar ${cat.name}`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
