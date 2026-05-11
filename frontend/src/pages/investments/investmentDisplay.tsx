import { formatCurrency } from '@/lib/utils'

type InstrumentGroup = 'equity' | 'funds' | 'fixed' | 'crypto' | 'other'

const INSTRUMENT_GROUP_BY_TYPE: Record<string, InstrumentGroup> = {
  Acciones: 'equity',
  Accion: 'equity',
  'Acción': 'equity',
  ETF: 'equity',
  Fondos: 'funds',
  Fondo: 'funds',
  'Fondo de pensiones': 'funds',
  Bonos: 'fixed',
  CDT: 'fixed',
  Cripto: 'crypto',
  Criptomoneda: 'crypto',
  Otro: 'other',
}

const GROUP_STYLE: Record<InstrumentGroup, { bg: string; text: string; ring: string; shadow: string }> = {
  equity: { bg: 'bg-brand-light', text: 'text-brand', ring: 'ring-brand/45', shadow: 'shadow-[inset_0_0_0_1px_rgba(202,11,11,0.18)]' },
  funds: { bg: 'bg-success-bg', text: 'text-success', ring: 'ring-success/45', shadow: 'shadow-[inset_0_0_0_1px_rgba(34,197,94,0.18)]' },
  fixed: { bg: 'bg-warning-bg', text: 'text-warning', ring: 'ring-warning/45', shadow: 'shadow-[inset_0_0_0_1px_rgba(245,158,11,0.22)]' },
  crypto: { bg: 'bg-warning-bg', text: 'text-warning', ring: 'ring-warning/45', shadow: 'shadow-[inset_0_0_0_1px_rgba(245,158,11,0.22)]' },
  other: { bg: 'bg-neutral-100', text: 'text-neutral-700', ring: 'ring-neutral-300/90', shadow: 'shadow-[inset_0_0_0_1px_rgba(148,163,184,0.22)]' },
}

function getInstrumentGroup(type: string): InstrumentGroup {
  return INSTRUMENT_GROUP_BY_TYPE[type] ?? 'other'
}

export function formatInvestmentDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function daysSinceInvestment(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function renderInstrumentBadge(type: string) {
  const style = GROUP_STYLE[getInstrumentGroup(type)]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${style.bg} ${style.text} ${style.ring} ${style.shadow}`}>
      {type}
    </span>
  )
}

export { formatCurrency }
