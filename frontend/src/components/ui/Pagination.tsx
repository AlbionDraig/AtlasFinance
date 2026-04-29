import Select from './Select'
import { useTranslation } from 'react-i18next'

const PAGE_SIZE_OPTIONS = [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '15', label: '15' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
]

interface PaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  onPrevPage: () => void
  onNextPage: () => void
  onPageSizeChange: (size: number) => void
  className?: string
}

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  onPrevPage,
  onNextPage,
  onPageSizeChange,
  className = '',
}: PaginationProps) {
  const { t } = useTranslation()
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-[var(--af-border)] px-5 py-4 ${className}`}>
      <div className="flex items-center gap-2">
        <label className="app-label whitespace-nowrap">{t('common.perPage')}</label>
        <Select
          value={String(pageSize)}
          onChange={(value) => onPageSizeChange(Number(value))}
          options={PAGE_SIZE_OPTIONS}
          visibleItems={3}
          className="w-20"
        />
      </div>
      <div className="flex items-center gap-3">
        <p className="app-subtitle text-sm">{t('common.page')} {currentPage} {t('common.of')} {totalPages}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={currentPage === 1}
            aria-label={t('common.prevPage')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-100 bg-white text-neutral-700 transition-colors hover:border-brand hover:bg-brand-light hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-100 disabled:hover:bg-white disabled:hover:text-neutral-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onNextPage}
            disabled={currentPage === totalPages}
            aria-label={t('common.nextPage')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-100 bg-white text-neutral-700 transition-colors hover:border-brand hover:bg-brand-light hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-100 disabled:hover:bg-white disabled:hover:text-neutral-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
