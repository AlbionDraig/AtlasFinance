import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from './Modal'

interface FloatingModalFrameProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  icon?: ReactNode
  maxWidth?: string
  accent?: 'brand' | 'neutral' | 'warning'
  bodyClassName?: string
  overflow?: 'hidden' | 'visible'
}

/**
 * Reusable floating modal frame with consistent header, close action and footer zone.
 */
export default function FloatingModalFrame({
  title,
  subtitle,
  onClose,
  children,
  footer,
  icon,
  maxWidth = 'max-w-2xl',
  accent = 'brand',
  bodyClassName = 'p-6',
  overflow = 'hidden',
}: FloatingModalFrameProps) {
  const { t } = useTranslation()

  const overflowClass = overflow === 'visible' ? 'overflow-visible' : 'overflow-hidden'

  const containerClass = accent === 'brand'
    ? `w-full rounded-2xl border border-neutral-100 border-t-4 border-t-brand bg-white shadow-xl ${overflowClass}`
    : accent === 'warning'
      ? `w-full rounded-2xl border border-neutral-100 border-t-4 border-t-warning bg-white shadow-xl ${overflowClass}`
      : `w-full rounded-2xl border border-neutral-100 bg-white shadow-xl ${overflowClass}`

  const headerClass = accent === 'brand'
    ? 'flex items-start gap-3 border-b border-brand/10 bg-brand-light px-6 py-4'
    : accent === 'warning'
      ? 'flex items-start gap-3 border-b border-warning/10 bg-warning-bg px-6 py-4'
      : 'flex items-start gap-3 border-b border-neutral-100 px-6 py-4'

  const titleClass = accent === 'brand'
    ? 'app-section-title text-brand-text'
    : accent === 'warning'
      ? 'app-section-title text-warning-text'
      : 'text-base font-medium text-neutral-900'

  const iconClass = accent === 'brand'
    ? 'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_0_5px_rgba(202,11,11,0.10)]'
    : accent === 'warning'
      ? 'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning text-white shadow-[0_0_0_5px_rgba(196,122,0,0.10)]'
      : 'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-text'

  return (
    <Modal onClose={onClose} maxWidth={maxWidth}>
      <div className={containerClass}>
        <div className={headerClass}>
          {icon && (
            <div className={iconClass}>
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className={titleClass}>{title}</h2>
            {subtitle && <p className="text-sm text-neutral-700 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto -mt-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={bodyClassName}>{children}</div>

        {footer && (
          <div className="px-6 pb-6 pt-1">
            {footer}
          </div>
        )}
      </div>
    </Modal>
  )
}