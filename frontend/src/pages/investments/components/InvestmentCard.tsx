import type { Investment } from '@/types'
import type { InvestmentEntity } from '@/api/investmentEntities'
import { INSTRUMENT_COLORS } from '@/lib/chartTheme'
import EditButton from '@/components/ui/EditButton'
import DeleteButton from '@/components/ui/DeleteButton'
import { formatCurrency } from '@/lib/utils'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface InvestmentCardProps {
  investment: Investment
  entity?: InvestmentEntity
  onEdit: (investment: Investment) => void
  onDelete: (investment: Investment) => void
}

export default function InvestmentCard({ investment, entity, onEdit, onDelete }: InvestmentCardProps) {
  const gain = investment.current_value - investment.amount_invested
  const pct = investment.amount_invested > 0 ? ((gain / investment.amount_invested) * 100).toFixed(1) : '0.0'
  const positive = gain >= 0
  const style = INSTRUMENT_COLORS[investment.instrument_type] ?? { bg: 'bg-neutral-100', text: 'text-neutral-700' }

  return (
    <div
      className={`bg-white border border-neutral-100 rounded-xl p-4 flex flex-col gap-3 ${
        positive ? 'border-t-2 border-t-success' : 'border-t-2 border-t-warning'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 truncate">{investment.name}</p>
          <p className="text-xs text-neutral-400 truncate">{entity?.name ?? '—'}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <EditButton onClick={() => onEdit(investment)} />
          <DeleteButton onClick={() => onDelete(investment)} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
          {investment.instrument_type}
        </span>
        <span className="text-xs bg-neutral-100 text-neutral-700 rounded-full px-2 py-0.5 font-medium">
          {investment.currency}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-neutral-400 uppercase tracking-wide">Invertido</p>
          <p className="text-neutral-900 font-medium mt-0.5">
            {formatCurrency(investment.amount_invested, investment.currency)}
          </p>
        </div>
        <div>
          <p className="text-neutral-400 uppercase tracking-wide">Valor actual</p>
          <p className="text-neutral-900 font-medium mt-0.5">
            {formatCurrency(investment.current_value, investment.currency)}
          </p>
        </div>
      </div>

      <div className={`rounded-lg px-3 py-2 ${positive ? 'bg-success-bg' : 'bg-warning-bg'}`}>
        <p className={`text-xs font-medium ${positive ? 'text-success-text' : 'text-warning-text'}`}>
          {positive ? '+' : ''}{formatCurrency(gain, investment.currency)}
          <span className="font-normal ml-1 opacity-80">({positive ? '+' : ''}{pct}%)</span>
        </p>
      </div>

      <p className="text-xs text-neutral-400">Desde {formatDate(investment.started_at)}</p>
    </div>
  )
}
