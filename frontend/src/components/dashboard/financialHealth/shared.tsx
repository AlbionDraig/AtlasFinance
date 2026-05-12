import AppTooltip from '@/components/ui/Tooltip'
import type { HealthBadgeVariant } from './types'

interface BadgeProps {
  text: string
  variant: HealthBadgeVariant
  hint?: string
}

const BADGE_STYLES: Record<HealthBadgeVariant, { background: string; color: string; border: string }> = {
  brand:   { background: '#f5bcbc', color: '#7a0505', border: '#e08080' },
  success: { background: '#b8e3d4', color: '#0a4a32', border: '#6fc4a8' },
  warning: { background: '#ffd98a', color: '#6b4000', border: '#f0b030' },
  neutral: { background: '#edeceb', color: '#4a4845', border: '#b0aeab' },
}

export function FinancialHealthBadge({ text, variant, hint }: BadgeProps) {
  const { background, color, border } = BADGE_STYLES[variant]

  const content = (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide shadow-sm${hint ? ' cursor-help' : ''}`}
      style={{ background, color, border: `1px solid ${border}` }}
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
