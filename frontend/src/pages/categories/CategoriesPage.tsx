import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import apiClient from '@/lib/axios'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/ui/Modal'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Category {
  id: number
  name: string
  keywords: string | null
  is_fixed: boolean
}

interface CategoryForm {
  name: string
  keywords: string
  is_fixed: boolean
}

function emptyForm(): CategoryForm {
  return { name: '', keywords: '', is_fixed: false }
}

function getApiError(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return fallback
}

export default function CategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchCategories() {
    try {
      const res = await apiClient.get<Category[]>('/categories')
      setCategories(res.data)
    } catch {
      toast('No se pudieron cargar las categorías', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, keywords: cat.keywords ?? '', is_fixed: cat.is_fixed })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm())
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('El nombre es obligatorio')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name.trim(),
        keywords: form.keywords.trim() || null,
        is_fixed: form.is_fixed,
      }
      if (editing) {
        await apiClient.put(`/categories/${editing.id}`, payload)
        toast('Categoría actualizada')
      } else {
        await apiClient.post('/categories', payload)
        toast('Categoría creada')
      }
      closeForm()
      await fetchCategories()
    } catch (err) {
      setFormError(getApiError(err, 'Error al guardar la categoría'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient.delete(`/categories/${deleteTarget.id}`)
      toast('Categoría eliminada')
      setDeleteTarget(null)
      await fetchCategories()
    } catch (err) {
      toast(getApiError(err, 'Error al eliminar la categoría'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-neutral-900 font-medium text-2xl">Categorías</h1>
          <p className="text-neutral-700 text-sm mt-0.5">
            Organiza tus transacciones y define palabras clave para clasificación automática.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-brand text-white hover:bg-brand-hover rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          + Nueva categoría
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white border border-neutral-100 rounded-xl p-12 text-center">
          <p className="text-neutral-400 text-sm">No hay categorías todavía.</p>
          <button
            onClick={openCreate}
            className="mt-4 border border-brand text-brand hover:bg-brand-light rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Crear primera categoría
          </button>
        </div>
      ) : (
        <div className="bg-white border border-neutral-100 rounded-xl divide-y divide-neutral-100">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-neutral-900 font-medium text-sm truncate">{cat.name}</p>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    cat.is_fixed
                      ? 'bg-warning-bg text-warning-text'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}>
                    {cat.is_fixed ? 'Fijo' : 'Variable'}
                  </span>
                </div>
                {cat.keywords ? (
                  <p className="text-neutral-400 text-xs mt-0.5 truncate">
                    {cat.keywords}
                  </p>
                ) : (
                  <p className="text-neutral-400 text-xs mt-0.5 italic">Sin palabras clave</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEdit(cat)}
                  className="border border-brand text-brand hover:bg-brand-light rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => setDeleteTarget(cat)}
                  className="bg-brand-light text-brand-text hover:bg-brand hover:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <Modal onClose={closeForm}>
          <h2 className="text-neutral-900 font-medium text-base mb-4">
            {editing ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium tracking-widest uppercase text-neutral-700">
              Nombre
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Alimentación"
              className="w-full bg-white border border-neutral-100 text-neutral-900 placeholder:text-neutral-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium tracking-widest uppercase text-neutral-700">
              Palabras clave
            </label>
            <textarea
              value={form.keywords}
              onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              placeholder="restaurante, mercado, cafe, domicilio"
              rows={3}
              className="w-full bg-white border border-neutral-100 text-neutral-900 placeholder:text-neutral-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
            />
            <p className="text-neutral-400 text-xs">
              Separadas por coma. Se usan para clasificar transacciones importadas automáticamente.
            </p>
          </div>

          <div className="flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-neutral-900">Gasto fijo</p>
              <p className="text-xs text-neutral-400 mt-0.5">Las transacciones de esta categoría cuentan como gastos fijos</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_fixed: !f.is_fixed }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                form.is_fixed ? 'bg-warning' : 'bg-neutral-400'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  form.is_fixed ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {formError && (
            <p className="text-brand-text text-sm bg-brand-light rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeForm}
              className="border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-brand text-white hover:bg-brand-hover disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {!!deleteTarget && (
        <ConfirmDeleteModal
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleting}
          title="Eliminar categoría"
          description={
            `¿Eliminar "${deleteTarget.name}"? Las transacciones asociadas quedarán sin categoría.`
          }
        />
      )}
    </div>
  )
}
