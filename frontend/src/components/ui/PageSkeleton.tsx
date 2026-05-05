import SkeletonCard from './SkeletonCard'
import SkeletonTable from './SkeletonTable'

interface PageSkeletonProps {
  /** Number of KPI/summary cards to render at the top. */
  cards?: number
  /** Number of skeleton table rows. */
  rows?: number
  /** Number of skeleton table columns. */
  columns?: number
  /** Show a skeleton header (title + subtitle). Defaults to true. */
  showHeader?: boolean
}

/**
 * PageSkeleton — placeholder consistente para páginas de listado mientras
 * los datos cargan. Reemplaza al `LoadingSpinner` central que producía un
 * "salto" de layout cuando aparecía el contenido real.
 */
export default function PageSkeleton({
  cards = 0,
  rows = 6,
  columns = 5,
  showHeader = true,
}: PageSkeletonProps) {
  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      {showHeader && (
        <div className="animate-pulse" aria-busy="true" aria-label="Cargando…">
          <div className="h-5 w-48 rounded bg-neutral-100 mb-2" />
          <div className="h-3 w-64 rounded bg-neutral-100" />
        </div>
      )}
      {cards > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      <div className="bg-white border border-neutral-100 rounded-xl p-2">
        <SkeletonTable rows={rows} columns={columns} />
      </div>
    </div>
  )
}
