import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { categoriesApi, type Category, type CategoryPayload } from '@/api/categories'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import PageSkeleton from '@/components/ui/PageSkeleton'
import FilterCard from '@/components/ui/FilterCard'
import SearchInput from '@/components/ui/SearchInput'
import FloatingActionMenu from '@/components/ui/FloatingActionMenu'
import { useToast } from '@/hooks/useToast'
import { useCategoriesData } from '@/hooks/useCategoriesData'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'
import CategoryModal, { type FormState } from './components/CategoryModal'
import CategoryGroup from './components/CategoryGroup'

const EMPTY_FORM: FormState = { name: '', is_fixed: false, description: '' }
const UNDO_WINDOW_MS = 5000

export default function CategoriesPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { categories, setCategories, loading } = useCategoriesData()
  const [saving, setSaving] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [query, setQuery] = useState('')
  const pendingDeleteTimeoutsRef = useRef<Map<number, number>>(new Map())

  async function handleCreate(data: FormState) {
    setSaving(true)
    try {
      const payload: CategoryPayload = { name: data.name, is_fixed: data.is_fixed, description: data.description || null }
      const r = await categoriesApi.create(payload)
      setCategories((prev) => [r.data, ...prev])
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories })
      setShowCreate(false)
      toast(t('categories.toast_created'), 'success')
    } catch {
      toast(t('categories.toast_create_error'), 'error')
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
      setCategories((prev) => prev.map((c) => (c.id === editing.id ? r.data : c)))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories })
      setEditing(null)
      toast(t('categories.toast_updated'), 'success')
    } catch {
      toast(t('categories.toast_update_error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    const target = deleting
    const previousIndex = categories.findIndex((category) => category.id === target.id)
    setCategories((prev) => prev.filter((c) => c.id !== target.id))
    setDeleting(null)

    const timeoutId = window.setTimeout(async () => {
      pendingDeleteTimeoutsRef.current.delete(target.id)
      try {
        await categoriesApi.delete(target.id)
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories })
      } catch {
        setCategories((prev) => {
          if (prev.some((category) => category.id === target.id)) return prev
          const next = [...prev]
          const index = previousIndex >= 0 ? Math.min(previousIndex, next.length) : next.length
          next.splice(index, 0, target)
          return next
        })
        toast(t('categories.toast_delete_error'), 'error')
      }
    }, UNDO_WINDOW_MS)

    pendingDeleteTimeoutsRef.current.set(target.id, timeoutId)
    toast(t('categories.toast_deleted'), 'success', {
      actionLabel: t('common.undo'),
      onAction: () => {
        const pendingTimeoutId = pendingDeleteTimeoutsRef.current.get(target.id)
        if (pendingTimeoutId != null) {
          window.clearTimeout(pendingTimeoutId)
          pendingDeleteTimeoutsRef.current.delete(target.id)
          setCategories((prev) => {
            if (prev.some((category) => category.id === target.id)) return prev
            const next = [...prev]
            const index = previousIndex >= 0 ? Math.min(previousIndex, next.length) : next.length
            next.splice(index, 0, target)
            return next
          })
        }
      },
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? categories.filter((c) => {
          const description = c.description?.toLowerCase() ?? ''
          return c.name.toLowerCase().includes(q) || description.includes(q)
        })
      : categories
  }, [categories, query])

  const activeFilters = useMemo(() => {
    const q = query.trim()
    return q ? [t('categories.chip_search', { value: q })] : []
  }, [query])

  const fixed = filtered.filter((c) => c.is_fixed)
  const variable = filtered.filter((c) => !c.is_fixed)

  if (loading) {
    return <PageSkeleton rows={6} columns={4} />
  }

  const content = (
    <>
      <FilterCard sticky activeFilters={activeFilters}>
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <label className="app-label">{t('common.search')}</label>
          <SearchInput value={query} onChange={setQuery} placeholder={t('categories.search_placeholder')} />
        </div>
      </FilterCard>

      {categories.length === 0 ? (
        <div className="app-card flex flex-col items-center gap-3 p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
            <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M11 7h6M7 12h.01M11 12h6M7 17h.01M11 17h6" />
            </svg>
          </div>
          <p className="text-sm text-neutral-700">{t('categories.empty_title')}</p>
          <p className="text-xs text-neutral-400">{t('categories.empty_desc')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="app-card flex flex-col items-center gap-3 p-10">
          <svg className="h-8 w-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <p className="text-sm text-neutral-700">{t('categories.empty_search_title', { query })}</p>
          <button type="button" onClick={() => setQuery('')} className="text-xs text-brand hover:underline">{t('categories.empty_search_clear')}</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <CategoryGroup
            title={t('categories.group_fixed_title')}
            subtitle={t('categories.group_fixed_subtitle')}
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
            title={t('categories.group_variable_title')}
            subtitle={t('categories.group_variable_subtitle')}
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

      {showCreate && (
        <CategoryModal
          title={t('categories.create_title')}
          initial={EMPTY_FORM}
          loading={saving}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editing && (
        <CategoryModal
          title={t('categories.edit_title')}
          initial={{ name: editing.name, is_fixed: editing.is_fixed, description: editing.description ?? '' }}
          loading={saving}
          onSubmit={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          title={t('categories.delete_title')}
          description={t('categories.delete_desc', { name: deleting.name })}
          loading={saving}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}

      <FloatingActionMenu
        hidden={!!(showCreate || editing || deleting)}
        ariaLabel={t('categories.fab_create')}
        items={[
          {
            key: 'create-category',
            label: t('categories.fab_create'),
            onClick: () => setShowCreate(true),
          },
        ]}
      />
    </>
  )

  if (embedded) return content

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      {content}
    </div>
  )
}
