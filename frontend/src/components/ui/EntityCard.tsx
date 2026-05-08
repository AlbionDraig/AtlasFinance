import type { CSSProperties, ReactNode } from 'react'

interface EntityCardAccentStyle {
  /** Color de la franja lateral y del badge. */
  accentColor: string
  /** Fondo suave para el badge (color-mix o similar). */
  badgeBg: string
  /** Color de texto del badge. */
  badgeText: string
  /** Color de borde del badge. */
  badgeBorder: string
}

interface EntityCardProps {
  /** Título principal de la tarjeta. */
  title: string
  /** Texto del badge (ej. moneda, tipo, estado). */
  badge?: string
  /** Valor numérico / texto destacado grande. */
  value: string
  /** Contenido del footer izquierdo (ej. banco · cuenta). */
  footerLabel?: ReactNode
  /** Acciones (ej. botones editar / eliminar). */
  actions?: ReactNode
  /** Estilos de acento derivados de la entidad asociada. */
  accentStyle?: EntityCardAccentStyle
  /** Icono opcional en el footer izquierdo. */
  footerIcon?: ReactNode
}

/**
 * Tarjeta de entidad reutilizable con franja de color lateral,
 * badge, valor destacado y footer con acciones.
 * Usada en Bolsillos, y extensible a Cuentas, Inversiones, etc.
 */
export default function EntityCard({
  title,
  badge,
  value,
  footerLabel,
  actions,
  accentStyle,
  footerIcon,
}: EntityCardProps) {
  const cardStyle: CSSProperties | undefined = accentStyle
    ? { borderLeftColor: accentStyle.accentColor, borderLeftWidth: '6px' }
    : undefined

  const badgeStyle: CSSProperties | undefined = accentStyle
    ? {
        backgroundColor: accentStyle.badgeBg,
        color: accentStyle.badgeText,
        borderColor: accentStyle.badgeBorder,
      }
    : undefined

  return (
    <article className="app-card overflow-hidden" style={cardStyle}>
      {/* Cuerpo principal */}
      <div className="p-4 pb-3 flex flex-col gap-2">
        {/* Fila 1: título + badge */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-900 truncate">{title}</h2>
          {badge && (
            <span
              className="shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wider"
              style={badgeStyle}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Fila 2: valor destacado */}
        <p className="text-[1.9rem] font-semibold tracking-tight text-neutral-900 tabular-nums leading-none py-1">
          {value}
        </p>
      </div>

      {/* Footer */}
      {(footerLabel ?? actions) && (
        <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between gap-2">
          {footerLabel && (
            <div className="flex items-center gap-1.5 min-w-0">
              {footerIcon ?? (
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-neutral-300">
                  <rect x="1" y="5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M1 8h14" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              )}
              <p className="text-xs text-neutral-500 truncate">{footerLabel}</p>
            </div>
          )}
          {actions && (
            <div className="flex items-center gap-0.5 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
