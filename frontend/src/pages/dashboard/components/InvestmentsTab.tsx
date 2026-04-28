import { useEffect, useMemo, useState } from 'react'
import { investmentsApi } from '@/api/investments'
import Select from '@/components/ui/Select'
import FilterCard from '@/components/ui/FilterCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/hooks/useToast'
import type { Investment } from '@/types'
import { fmt, fmtDate } from './dashboardUtils'

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="app-section-title mb-3">{children}</h2>
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accentClass?: string
  accentRingClass?: string
  valueClass?: string
}
function KpiCard({
  label, value, sub,
  accentClass = 'bg-neutral-100',
  accentRingClass = 'ring-1 ring-neutral-100',
  valueClass = 'text-neutral-900',
}: KpiCardProps) {
  return (
    <div className={`app-card p-5 relative ${accentRingClass}`}>
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${accentClass}`} />
      <p className="app-label uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-medium leading-none ${valueClass}`}>{value}</p>
      {sub && <p className="app-subtitle text-xs mt-1.5 leading-snug">{sub}</p>}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface InvestmentsTabProps {
  currency: string
  onCurrencyChange: (value: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function InvestmentsTab({ currency, onCurrencyChange }: InvestmentsTabProps) {
  const { toast } = useToast()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    investmentsApi.list()
      .then((response) => setInvestments(response.data))
      .catch(() => toast('No se pudieron cargar las inversiones.', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const investmentRows = useMemo(() => {
    return [...investments]
      .filter((investment) => investment.currency === currency)
      .sort((a, b) => Number(b.current_value) - Number(a.current_value))
  }, [investments, currency])

  const totalInvested = useMemo(
    () => investmentRows.reduce((sum, inv) => sum + Number(inv.amount_invested), 0),
    [investmentRows],
  )

  const totalCurrent = useMemo(
    () => investmentRows.reduce((sum, inv) => sum + Number(inv.current_value), 0),
    [investmentRows],
  )

  const totalReturn = totalCurrent - totalInvested
  const totalReturnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

  const investmentsByType = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const inv of investmentRows) {
      grouped.set(inv.instrument_type, (grouped.get(inv.instrument_type) ?? 0) + Number(inv.current_value))
    }
    return Array.from(grouped.entries())
      .map(([type, value]) => ({ type, value }))
      .sort((a, b) => b.value - a.value)
  }, [investmentRows])

  if (loading) return (
    <div className="flex items-center justify-center h-56">
      <LoadingSpinner size={8} />
    </div>
  )

  return (
    <>
      <FilterCard sticky>
        <div className="flex flex-col gap-1 ml-auto">
          <label className="app-label">Moneda</label>
          <Select
            value={currency}
            onChange={onCurrencyChange}
            options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }]}
            className="w-24"
          />
        </div>
      </FilterCard>

      <section>
        <SectionTitle>Resumen de inversiones</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Capital invertido"
            value={fmt(totalInvested, currency)}
            accentClass="bg-brand"
            accentRingClass="ring-2 ring-brand/20"
            valueClass="text-brand"
            sub={`${investmentRows.length.toLocaleString('es-CO')} posiciones`}
          />
          <KpiCard
            label="Valor actual"
            value={fmt(totalCurrent, currency)}
            accentClass="bg-success"
            accentRingClass="ring-2 ring-success/20"
            valueClass="text-success"
            sub="valor total vigente"
          />
          <KpiCard
            label="Resultado"
            value={fmt(totalReturn, currency)}
            accentClass={totalReturn >= 0 ? 'bg-success' : 'bg-warning'}
            accentRingClass={totalReturn >= 0 ? 'ring-2 ring-success/20' : 'ring-2 ring-warning/20'}
            valueClass={totalReturn >= 0 ? 'text-success' : 'text-warning'}
            sub={totalReturn >= 0 ? 'ganancia acumulada' : 'pérdida acumulada'}
          />
          <KpiCard
            label="Rentabilidad"
            value={`${totalReturnPct > 0 ? '+' : ''}${totalReturnPct.toFixed(1)}%`}
            accentClass="bg-brand-deep"
            accentRingClass="ring-2 ring-brand-deep/20"
            valueClass="text-brand-deep"
            sub="sobre el capital invertido"
          />
        </div>
      </section>

      <section className="pt-1">
        <SectionTitle>Distribución por instrumento</SectionTitle>
        <div className="app-panel p-5 space-y-3">
          {investmentsByType.length === 0 ? (
            <p className="app-subtitle text-sm">No hay inversiones registradas en {currency}.</p>
          ) : (
            investmentsByType.map((item) => {
              const share = totalCurrent > 0 ? (item.value / totalCurrent) * 100 : 0
              return (
                <div key={item.type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700 font-medium">{item.type}</span>
                    <span className="text-neutral-900 font-medium">{fmt(item.value, currency)} ({share.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full bg-brand" style={{ width: `${share}%` }} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className="pt-1">
        <SectionTitle>Posiciones</SectionTitle>
        <div className="app-panel p-0 overflow-hidden">
          {investmentRows.length === 0 ? (
            <div className="p-8 text-center app-subtitle">
              <p className="text-sm">No hay inversiones registradas en {currency}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">Inversión</th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-widest uppercase text-neutral-700">Invertido</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-widest uppercase text-neutral-700">Actual</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-widest uppercase text-neutral-700">Resultado</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-widest uppercase text-neutral-700">Inicio</th>
                  </tr>
                </thead>
                <tbody>
                  {investmentRows.map((investment) => {
                    const result = Number(investment.current_value) - Number(investment.amount_invested)
                    return (
                      <tr key={investment.id} className="border-b border-neutral-100 last:border-b-0">
                        <td className="px-4 py-3 text-sm text-neutral-900">{investment.name}</td>
                        <td className="px-4 py-3 text-sm text-neutral-700">{investment.instrument_type}</td>
                        <td className="px-4 py-3 text-sm text-right text-neutral-900">{fmt(Number(investment.amount_invested), currency)}</td>
                        <td className="px-4 py-3 text-sm text-right text-neutral-900">{fmt(Number(investment.current_value), currency)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${result >= 0 ? 'text-success' : 'text-warning'}`}>
                          {fmt(result, currency)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-neutral-700">{fmtDate(investment.started_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
