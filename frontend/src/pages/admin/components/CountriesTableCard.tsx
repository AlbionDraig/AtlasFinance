import Badge from '@/components/ui/Badge'
import DeleteButton from '@/components/ui/DeleteButton'
import EditButton from '@/components/ui/EditButton'
import Pagination from '@/components/ui/Pagination'
import Tooltip from '@/components/ui/Tooltip'
import { useTranslation } from 'react-i18next'
import type { Country } from '@/api/countries'

interface CountriesTableCardProps {
  filteredCountries: Country[]
  paginatedCountries: Country[]
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  pageSize: number
  onPrevPage: () => void
  onNextPage: () => void
  onPageSizeChange: (size: number) => void
  onEdit: (country: Country) => void
  onDelete: (country: Country) => void
}

export default function CountriesTableCard({
  filteredCountries,
  paginatedCountries,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  pageSize,
  onPrevPage,
  onNextPage,
  onPageSizeChange,
  onEdit,
  onDelete,
}: CountriesTableCardProps) {
  const { t } = useTranslation()
  const metrics = [
    {
      key: 'count',
      variant: 'neutral' as const,
      label: t('admin.countries.metric_total', { count: filteredCountries.length }),
      help: t('admin.countries.metric_total_help'),
    },
  ]

  return (
    <section className="app-card overflow-visible">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-100 bg-neutral-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light text-brand">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-900">{t('admin.countries.table_title')}</h2>
            <p className="text-xs text-neutral-400">
              {filteredCountries.length ? `${startIndex + 1}-${endIndex} de ${filteredCountries.length} ${t('admin.countries.metric_total', { count: filteredCountries.length })}` : t('common.no_results')}
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

      {!paginatedCountries.length ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">{t('admin.countries.table_empty_title')}</p>
            <p className="mt-1 text-xs text-neutral-400">{t('admin.countries.table_empty_desc')}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-28" />
              <col className="w-[24rem]" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('admin.countries.table_col_code')}</th>
                <th className="border-b border-r border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('admin.countries.table_col_country')}</th>
                <th className="border-b border-neutral-100 bg-neutral-50 px-5 py-3 text-center text-xs font-medium tracking-widest uppercase text-neutral-700">{t('admin.countries.table_col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCountries.map((country) => (
                <tr key={country.id} className="group transition-colors hover:bg-brand-light/40 odd:bg-white even:bg-neutral-50/50">
                  <td className="border-b border-r border-neutral-100 px-5 py-3.5 align-middle text-sm text-neutral-700">
                    <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 whitespace-nowrap">
                      {country.code}
                    </span>
                  </td>
                  <td className="max-w-0 border-b border-r border-neutral-100 px-5 py-3.5 align-middle">
                    <span className="block truncate text-sm font-medium text-neutral-900" title={country.name}>
                      {country.name}
                    </span>
                  </td>
                  <td className="border-b border-neutral-100 px-5 py-3.5 align-middle">
                    <div className="flex items-center justify-end gap-1.5">
                      <EditButton onClick={() => onEdit(country)} label={`Editar ${country.name}`} />
                      <DeleteButton onClick={() => onDelete(country)} label={`Eliminar ${country.name}`} />
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