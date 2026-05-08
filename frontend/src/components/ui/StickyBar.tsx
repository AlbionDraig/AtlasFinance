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
 * Compensates the main container top padding so the sticky content snaps
 * flush with the visible top edge instead of leaving a background gap.
 */
export default function StickyBar({ children, className }: StickyBarProps) {
  return (
    <div
      className={`sticky top-[-1.5rem] z-50 relative -mx-4 md:-mx-6 px-4 md:px-6 pt-0 pb-0 bg-transparent ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
