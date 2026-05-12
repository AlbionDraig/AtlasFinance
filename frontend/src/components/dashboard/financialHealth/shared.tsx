import AppTooltip from '@/components/ui/Tooltip'
import type { HealthBadgeVariant } from './types'

interface BadgeProps {
  text: string
  variant: HealthBadgeVariant
  hint?: string
}

export function FinancialHealthBadge({ text, variant, hint }: BadgeProps) {
  const cls = {
    brand: 'bg-brand/10 text-brand-text border border-brand/20 shadow-sm',
    success: 'bg-success-bg/95 text-success-text border border-success/20 shadow-sm',
    warning: 'bg-warning-bg/95 text-warning-text border border-warning/20 shadow-sm',
    neutral: 'bg-neutral-100 text-neutral-800 border border-neutral-200 shadow-sm',
  }[variant]

  const content = (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${cls} ${hint ? 'cursor-help' : ''}`}
    >
      {text}
    </span>
  )

  if (!hint) return <span className="relative inline-flex">{content}</span>

  return (
    <AppTooltip content={hint} ariaLabel={hint} widthClassName="w-52">
      {content}
    </AppTooltip>
  )
}

export function FinancialHealthHelpTooltip({ text }: { text: string }) {
  return (
    <AppTooltip content={text} ariaLabel={text}>
      <span className="w-4 h-4 rounded-full bg-transparent border border-neutral-900 text-neutral-900 text-[10px] flex items-center justify-center cursor-help select-none leading-none font-medium">
        ?
      </span>
    </AppTooltip>
  )
}
