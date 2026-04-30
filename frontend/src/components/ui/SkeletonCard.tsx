/**
 * Placeholder animado para cards KPI mientras los datos cargan.
 * Usa el patrón animate-pulse con colores del sistema de diseño.
 */
interface SkeletonCardProps {
  /** Altura de la barra de valor principal. Por defecto 'h-7'. */
  valueHeight?: string
  /** Número de líneas de detalle bajo el valor. Por defecto 1. */
  lines?: number
  /** Clase de color del borde superior (por defecto border-t-brand). */
  borderColor?: string
}

export default function SkeletonCard({
  valueHeight = 'h-7',
  lines = 1,
  borderColor = 'border-t-brand',
}: SkeletonCardProps) {
  return (
    <div
      className={`bg-white border border-neutral-100 rounded-xl p-5 border-t-2 ${borderColor} animate-pulse`}
      aria-busy="true"
      aria-label="Cargando…"
    >
      {/* Label placeholder */}
      <div className="h-3 w-20 rounded bg-neutral-100 mb-3" />
      {/* Value placeholder */}
      <div className={`${valueHeight} w-32 rounded bg-neutral-100 mb-2`} />
      {/* Detail lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 w-24 rounded bg-neutral-100 mt-1.5" />
      ))}
    </div>
  )
}
