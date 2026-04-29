import Badge from '@/components/ui/Badge'
import DeleteButton from '@/components/ui/DeleteButton'
import EditButton from '@/components/ui/EditButton'
import Pagination from '@/components/ui/Pagination'
import Tooltip from '@/components/ui/Tooltip'
import { useTranslation } from 'react-i18next'
import type { InvestmentEntity } from '@/api/investmentEntities'

interface InvestmentEntitiesTableCardProps {
  filteredEntities: InvestmentEntity[]
  paginatedEntities: InvestmentEntity[]
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  pageSize: number
  typeLabelByValue: Record<string, string>
  onPrevPage: () => void
  onNextPage: () => void
  onPageSizeChange: (size: number) => void
  onEdit: (entity: InvestmentEntity) => void
  onDelete: (entity: InvestmentEntity) => void
}

export default function InvestmentEntitiesTableCard({
  filteredEntities,
  paginatedEntities,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  pageSize,
  typeLabelByValue,
  onPrevPage,
  onNextPage,
  onPageSizeChange,
  onEdit,
  onDelete,
}: InvestmentEntitiesTableCardProps) {
  const { t } = useTranslation()
  const countryCounts = filteredEntities.reduce<Record<string, number>>((accumulator, entity) => {
    const countryCode = entity.country_code.trim().toUpperCase()
    accumulator[countryCode] = (accumulator[countryCode] ?? 0) + 1
    return accumulator
  }, {})
  const typeCounts = filteredEntities.reduce<Record<string, number>>((accumulator, entity) => {
    accumulator[entity.entity_type] = (accumulator[entity.entity_type] ?? 0) + 1
    return accumulator
  }, {})

  const metrics = [
    {
      key: 'count',
      variant: 'neutral' as const,
      label: t('admin.entities.metric_total', { count: filteredEntities.length }),
      help: t('admin.entities.metric_total_help'),
    },
    {
      key: 'countries',
      variant: 'positive' as const,
      label: t('admin.entities.metric_countries', { count: Object.keys(countryCounts).length }),
      help: t('admin.entities.metric_countries_help'),
    },
    {
      key: 'types',
      variant: 'warning' as const,
      label: t('admin.entities.metric_types', { count: Object.keys(typeCounts).length }),
      help: t('admin.entities.metric_types_help'),
    },
  ]

  return (
    <section className="app-card overflow-visible">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-100 bg-neutral-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light text-brand">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">{t('admin.entities.table_title')}</h2>
            <p className="text-xs text-neutral-400">
              {filteredEntities.length ? `${startIndex + 1}-${endIndex} de ${filteredEntities.length} ${t('admin.entities.metric_total', { count: filteredEntities.length })}` : t('common.no_results')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 bg-white px-6 py-3">
        {metrics.map((metric) => (
          <Tooltip key={metric.key} content={metric.help} ariaLabel={`${metric.label}. ${metric.help}`}>
            <Badge variant={metric.variant}>{metric.label}</Badge>
          </Tooltip>
        ))}
      </div>

      {!paginatedEntities.length ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">{t('admin.entities.table_empty_title')}</p>
            <p className="mt-1 text-xs text-neutral-400">{t('admin.entities.table_empty_desc')}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[20rem]" />
              <col className="w-40" />
              <col className="w-36" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('admin.entities.table_col_entity')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('admin.entities.table_col_type')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('admin.entities.table_col_country')}</th>
                <th className="border-b border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntities.map((entity) => (
                <tr key={entity.id} className="group transition-colors hover:bg-brand-light/40 odd:bg-white even:bg-neutral-50/50">
                  <td className="max-w-0 border-b border-r border-neutral-100 px-5 py-3.5 align-middle">
                    <span className="block truncate text-sm font-medium text-neutral-900" title={entity.name}>
                      {entity.name}
                    </span>
                  </td>
                  <td className="border-b border-r border-neutral-100 px-5 py-3.5 align-middle text-sm text-neutral-700">
                    <span className="inline-flex items-center rounded-md bg-brand-light px-2 py-1 text-xs font-medium text-brand-text whitespace-nowrap">
                      {typeLabelByValue[entity.entity_type] ?? entity.entity_type}
                    </span>
                  </td>
                  <td className="border-b border-r border-neutral-100 px-5 py-3.5 align-middle text-sm text-neutral-700">
                    <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 whitespace-nowrap">
                      {entity.country_code}
                    </span>
                  </td>
                  <td className="border-b border-neutral-100 px-5 py-3.5 align-middle">
                    <div className="flex items-center justify-end gap-1.5">
                      <EditButton onClick={() => onEdit(entity)} label={`Editar ${entity.name}`} />
                      <DeleteButton onClick={() => onDelete(entity)} label={`Eliminar ${entity.name}`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onPageSizeChange={onPageSizeChange}
      />
    </section>
  )
}
