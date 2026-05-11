import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import FilterCard from './FilterCard'
import Modal from './Modal'
import StickyBar from './StickyBar'

interface ResponsiveFiltersProps {
  children: ReactNode
  activeFilters?: Array<{ id: string; label: string } | string>
  onResetFilters?: () => void
  onRemoveFilter?: (id: string) => void
  presets?: ReactNode
  mobileTitle: string
  stickyDesktop?: boolean
}

/**
 * Shared responsive filter layout with desktop sticky behavior and mobile modal panel.
 */
export default function ResponsiveFilters({
  children,
  activeFilters = [],
  onResetFilters,
  onRemoveFilter,
  presets,
  mobileTitle,
  stickyDesktop = true,
}: ResponsiveFiltersProps) {
  const { t } = useTranslation()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const desktopContent = (
    <div className="space-y-3">
      {presets && <div className="flex flex-wrap gap-2 px-4">{presets}</div>}
      <FilterCard activeFilters={activeFilters} onReset={onResetFilters} onRemoveFilter={onRemoveFilter}>
        {children}
      </FilterCard>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          data-testid="filters-open-button"
          className="inline-flex w-full items-center justify-between rounded-lg border border-neutral-100 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label={t('common.openFilters')}
        >
          <span>{t('common.openFilters')}</span>
          {activeFilters.length > 0 && (
            <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs text-brand-text">
              {t('common.activeCount', { count: activeFilters.length })}
            </span>
          )}
        </button>
      </div>

      <div className="hidden md:block">
        {stickyDesktop ? <StickyBar>{desktopContent}</StickyBar> : desktopContent}
      </div>

      {mobileFiltersOpen && (
        <Modal onClose={() => setMobileFiltersOpen(false)} maxWidth="max-w-2xl">
          <section data-testid="filters-mobile-panel" className="rounded-xl border border-neutral-100 bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <h2 className="text-base font-medium text-neutral-900">{mobileTitle}</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                data-testid="filters-close-button"
                className="rounded-md border border-neutral-100 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {t('common.close')}
              </button>
            </div>

            {presets && <div className="mb-3">{presets}</div>}

            <FilterCard activeFilters={activeFilters} onReset={onResetFilters} onRemoveFilter={onRemoveFilter}>
              {children}
            </FilterCard>
          </section>
        </Modal>
      )}
    </div>
  )
}
