import type { CSSProperties } from 'react'
import type { Account, Pocket } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { ACCOUNT_BASE_COLORS } from '@/lib/chartTheme'
import EditButton from '@/components/ui/EditButton'
import DeleteButton from '@/components/ui/DeleteButton'

export interface AccountVisualStyle {
  accent: string
  softBg: string
  softBorder: string
  softText: string
}

export function buildAccountVisualStyle(_accountId: number, index: number): AccountVisualStyle {
  const base = ACCOUNT_BASE_COLORS[index % ACCOUNT_BASE_COLORS.length]
  const tier = Math.floor(index / ACCOUNT_BASE_COLORS.length)
  const tint = Math.min(14 + tier * 8, 46)
  const borderTint = Math.min(tint + 8, 58)

  return {
    accent: base.accent,
    softBg: `color-mix(in srgb, ${base.accent} ${tint}%, white)`,
    softBorder: `color-mix(in srgb, ${base.accent} ${borderTint}%, white)`,
    softText: base.softText,
  }
}

interface PocketCardProps {
  pocket: Pocket
  account?: Account
  accountStyle?: AccountVisualStyle
  onEdit: (pocket: Pocket) => void
  onDelete: (pocket: Pocket) => void
}

export default function PocketCard({ pocket, account, accountStyle, onEdit, onDelete }: PocketCardProps) {
  const cardStyle: CSSProperties | undefined = accountStyle
    ? {
        borderTopColor: accountStyle.accent,
        background: `linear-gradient(180deg, ${accountStyle.softBg} 0%, #ffffff 36%)`,
      }
    : undefined

  const currencyBadgeStyle: CSSProperties | undefined = accountStyle
    ? {
        backgroundColor: accountStyle.softBg,
        color: accountStyle.softText,
        borderColor: accountStyle.softBorder,
      }
    : undefined

  return (
    <article className="app-card border-t-2 p-4 space-y-3" style={cardStyle}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base text-neutral-900 font-medium">{pocket.name}</h2>
        </div>
        <span
          className="rounded-full border px-3 py-1 text-xs font-medium tracking-wide shadow-sm"
          style={currencyBadgeStyle}
        >
          {pocket.currency}
        </span>
      </div>

      <div>
        <p className="text-2xl font-medium text-neutral-900">
          {formatCurrency(pocket.balance, pocket.currency)}
        </p>
        <p className="text-sm text-neutral-400 mt-1">
          Cuenta asociada: <span className="text-neutral-700">{account?.name ?? `#${pocket.account_id}`}</span>
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <EditButton onClick={() => onEdit(pocket)} />
        <DeleteButton onClick={() => onDelete(pocket)} />
      </div>
    </article>
  )
}
