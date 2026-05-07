import type { ReactNode } from 'react'

interface StickyBarProps {
  children: ReactNode
  className?: string
}

/**
 * Sticky top bar for filter panels.
 *
 * Works with pages that use:
 *   - wrapper: `space-y-7 md:space-y-8` (gap = 32px on md)
 *   - shell:   `p-4 md:p-6` (horizontal padding = 16px / 24px)
 *   - <main>:  `p-6` in AppLayout
 *
 * Keep the wrapper visually separated from content above without masking it.
 */
export default function StickyBar({ children, className }: StickyBarProps) {
  return (
    <div
      className={`sticky top-0 z-50 relative -mx-4 md:-mx-6 px-4 md:px-6 pt-3 pb-0 bg-neutral-50 ${className ?? ''}`}
    >
        {/* Keep the wrapper visually separated from content above */}
        <div className="absolute left-0 right-0 h-0 bg-neutral-50 pointer-events-none" />
      {children}
    </div>
  )
}
