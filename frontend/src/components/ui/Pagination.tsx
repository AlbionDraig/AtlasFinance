import Select from './Select'

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
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-[var(--af-border)] px-5 py-4 ${className}`}>
      <div className="flex items-center gap-2">
        <label className="app-label whitespace-nowrap">Por página</label>
        <Select
          value={String(pageSize)}
          onChange={(value) => onPageSizeChange(Number(value))}
          options={PAGE_SIZE_OPTIONS}
          visibleItems={3}
          className="w-20"
        />
      </div>
      <div className="flex items-center gap-3">
        <p className="app-subtitle text-sm">Página {currentPage} de {totalPages}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="app-btn-secondary !w-auto px-3 py-2 disabled:opacity-45 disabled:cursor-not-allowed"
            onClick={onPrevPage}
            disabled={currentPage === 1}
          >←</button>
          <button
            type="button"
            className="app-btn-secondary !w-auto px-3 py-2 disabled:opacity-45 disabled:cursor-not-allowed"
            onClick={onNextPage}
            disabled={currentPage === totalPages}
          >→</button>
        </div>
      </div>
    </div>
  )
}
