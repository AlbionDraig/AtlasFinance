import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category } from '@/api/categories'
import EditButton from '@/components/ui/EditButton'
import DeleteButton from '@/components/ui/DeleteButton'

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

export default function CategoryGroup({
  title,
  subtitle,
  accentClass,
  headerBg,
  titleColor,
  badgeColor,
  icon,
  items,
  onEdit,
  onDelete,
}: CategoryGroupProps) {
  const { t } = useTranslation()
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
            {items.length !== 1
              ? t('categories.group_count_plural', { count: items.length })
              : t('categories.group_count_singular', { count: items.length })}
          </span>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-5 text-sm text-neutral-400">{t('categories.group_empty')}</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {items.map((cat) => (
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
