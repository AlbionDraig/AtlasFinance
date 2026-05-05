/**
 * Placeholder animado para tablas de datos mientras cargan.
 * Renderiza `rows` filas con columnas de ancho variable simulando contenido.
 */
interface SkeletonTableProps {
  rows?: number
  columns?: number
}

export default function SkeletonTable({ rows = 6, columns = 5 }: SkeletonTableProps) {
  const widths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16', 'w-36', 'w-14']

  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Cargando tabla…">
      {/* Header */}
      <div className="flex gap-4 px-4 py-2 border-b border-neutral-100">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-neutral-100 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 px-4 py-3 border-b border-neutral-100 last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={`h-4 rounded bg-neutral-100 ${widths[(rowIndex * columns + colIndex) % widths.length]}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
