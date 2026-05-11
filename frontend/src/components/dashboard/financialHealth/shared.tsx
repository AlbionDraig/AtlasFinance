import AppTooltip from '@/components/ui/Tooltip'
import type { HealthBadgeVariant } from './types'

interface BadgeProps {
  text: string
  variant: HealthBadgeVariant
  hint?: string
}

export function FinancialHealthBadge({ text, variant, hint }: BadgeProps) {
  const cls = {
    brand: 'bg-brand-light text-brand-text',
    success: 'bg-success-bg text-success-text',
    warning: 'bg-warning-bg text-warning-text',
    neutral: 'bg-neutral-100 text-neutral-700',
  }[variant]

  const content = (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cls} ${hint ? 'cursor-help' : ''}`}>
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
