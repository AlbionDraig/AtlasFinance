import type { ReactNode } from 'react'
import StickyBar from './StickyBar'
import Badge from './Badge'

interface FilterCardProps {
  /** Campos de filtro: inputs, selects, date pickers, etc. */
  children: ReactNode
  /** Chips que describen los filtros activos (opcional) */
  activeFilters?: string[]
  /** Callback para limpiar todos los filtros (opcional) */
  onReset?: () => void
  /** Clases extra para el contenedor interno de campos */
  className?: string
  /** Si es true, renderiza la tarjeta dentro de StickyBar */
  sticky?: boolean
  /** Clases extra para el wrapper sticky */
  stickyClassName?: string
}

export default function FilterCard({
  children,
  activeFilters = [],
  onReset,
  className = '',
  sticky = false,
  stickyClassName,
}: FilterCardProps) {
  const content = (
    <div className="app-filter-card space-y-4">
      {/* Fila de campos */}
      <div className={`flex flex-wrap items-end gap-3 ${className}`}>
        {children}

        {/* Botón limpiar — aparece solo si hay filtros activos y se pasó onReset */}
        {onReset && activeFilters.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="app-label opacity-0 select-none" aria-hidden="true">_</label>
            <button
              type="button"
              onClick={onReset}
              className="flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors border-brand bg-brand text-white hover:bg-brand-hover hover:border-brand-hover"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Chips de filtros activos */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(label => (
            <Badge key={label}>{label}</Badge>
          ))}
        </div>
      )}
    </div>
  )

  if (!sticky) {
    return content
  }

  return <StickyBar className={stickyClassName}>{content}</StickyBar>
}
