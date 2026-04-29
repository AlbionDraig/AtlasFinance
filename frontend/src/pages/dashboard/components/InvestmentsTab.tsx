import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { investmentsApi } from '@/api/investments'
import { investmentEntitiesApi } from '@/api/investmentEntities'
import type { InvestmentEntity } from '@/api/investmentEntities'
import AppTooltip from '@/components/ui/Tooltip'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import FilterCard from '@/components/ui/FilterCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/hooks/useToast'
import {
  INSTRUMENT_COLORS,
  INSTRUMENT_PROGRESS_COLORS,
  INSTRUMENT_FILL_COLORS,
  CHART_TOOLTIP_STYLE,
} from '@/lib/chartTheme'
import type { Investment } from '@/types'
import { fmt, fmtDate, fmtDateNumeric } from './dashboardUtils'

// ─── Sub-components ───────────────────────────────────────────────────────────
function HelpTooltip({ text }: { text: string }) {
  return (
    <AppTooltip content={text} ariaLabel={text}>
      <span className="w-4 h-4 rounded-full border border-neutral-400 text-neutral-400 text-[10px] flex items-center justify-center cursor-help select-none leading-none font-medium hover:border-neutral-700 hover:text-neutral-700 transition-colors">
        ?
      </span>
    </AppTooltip>
  )
}

function SectionTitle({ children, help }: { children: React.ReactNode; help?: string }) {
  return (
    <div className="mb-3">
      <div className="inline-flex items-center gap-2">
        <h2 className="app-section-title">{children}</h2>
        {help && <HelpTooltip text={help} />}
      </div>
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  help?: string
  accentClass?: string
  accentRingClass?: string
  valueClass?: string
}
function KpiCard({
  label, value, sub, help,
  accentClass = 'bg-neutral-100',
  accentRingClass = 'ring-1 ring-neutral-100',
  valueClass = 'text-neutral-900',
}: KpiCardProps) {
  return (
    <div className={`app-card p-5 relative ${accentRingClass}`}>
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${accentClass}`} />
      {help && <span className="absolute top-3 right-3"><HelpTooltip text={help} /></span>}
      <p className="app-label uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-medium leading-none ${valueClass}`}>{value}</p>
      {sub && <p className="app-subtitle text-xs mt-1.5 leading-snug">{sub}</p>}
    </div>
  )
}

interface InsightCardProps {
  label: string
  name: string
  sub: string
  help?: string
  accentClass?: string
}
function InsightCard({ label, name, sub, help, accentClass = 'border-l-neutral-400' }: InsightCardProps) {
  return (
    <div className={`bg-white border border-neutral-100 border-l-4 ${accentClass} rounded-xl p-4 shadow-sm relative transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md`}>
      {help && <span className="absolute top-3 right-3"><HelpTooltip text={help} /></span>}
      <p className="app-label uppercase tracking-wider mb-2">{label}</p>
      <p className="text-xl font-medium text-neutral-900 truncate leading-snug">{name}</p>
      <p className="app-subtitle text-xs mt-1.5 leading-snug">{sub}</p>
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
  const { t } = useTranslation()
  const { toast } = useToast()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [entities, setEntities] = useState<InvestmentEntity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([investmentsApi.list(), investmentEntitiesApi.list()])
      .then(([invRes, entRes]) => {
        setInvestments(invRes.data)
        setEntities(entRes.data)
      })
      .catch(() => toast(t('dashboard.inv_toast_load_error'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  const entityMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const e of entities) map.set(e.id, e.name)
    return map
  }, [entities])

  const investmentRows = useMemo(() => {
    return [...investments]
      .filter((inv) => inv.currency === currency)
      .sort((a, b) => {
        const retA = Number(a.amount_invested) > 0
          ? (Number(a.current_value) - Number(a.amount_invested)) / Number(a.amount_invested)
          : 0
        const retB = Number(b.amount_invested) > 0
          ? (Number(b.current_value) - Number(b.amount_invested)) / Number(b.amount_invested)
          : 0
        return retB - retA
      })
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

  const topPerformer = useMemo(() => {
    if (investmentRows.length === 0) return null
    return investmentRows[0]
  }, [investmentRows])

  const worstPerformer = useMemo(() => {
    if (investmentRows.length === 0) return null
    return [...investmentRows].sort((a, b) => {
      const retA = Number(a.amount_invested) > 0
        ? (Number(a.current_value) - Number(a.amount_invested)) / Number(a.amount_invested)
        : 0
      const retB = Number(b.amount_invested) > 0
        ? (Number(b.current_value) - Number(b.amount_invested)) / Number(b.amount_invested)
        : 0
      return retA - retB
    })[0]
  }, [investmentRows])

  // Mayor posición por capital actual
  const largestPosition = useMemo(() => {
    if (investmentRows.length === 0) return null
    return [...investmentRows].sort((a, b) => Number(b.current_value) - Number(a.current_value))[0]
  }, [investmentRows])

  // Posición más antigua
  const oldestPosition = useMemo(() => {
    if (investmentRows.length === 0) return null
    return [...investmentRows].sort((a, b) => a.started_at.localeCompare(b.started_at))[0]
  }, [investmentRows])

  // Entidad con más capital actual
  const topEntity = useMemo(() => {
    if (investmentRows.length === 0) return null
    const byEntity = new Map<number, number>()
    for (const inv of investmentRows) {
      byEntity.set(inv.investment_entity_id, (byEntity.get(inv.investment_entity_id) ?? 0) + Number(inv.current_value))
    }
    const [topId, topVal] = [...byEntity.entries()].sort((a, b) => b[1] - a[1])[0]
    return { id: topId, value: topVal, name: entityMap.get(topId) ?? '—' }
  }, [investmentRows, entityMap])

  // Capital en posiciones negativas
  const capitalAtRisk = useMemo(
    () => investmentRows
      .filter(i => Number(i.current_value) < Number(i.amount_invested))
      .reduce((sum, i) => sum + Number(i.amount_invested), 0),
    [investmentRows],
  )

  // Rentabilidad media ponderada por capital invertido
  const weightedAvgReturn = useMemo(() => {
    if (totalInvested === 0) return 0
    return investmentRows.reduce((sum, inv) => {
      const w = Number(inv.amount_invested) / totalInvested
      const r = Number(inv.amount_invested) > 0
        ? (Number(inv.current_value) - Number(inv.amount_invested)) / Number(inv.amount_invested) * 100
        : 0
      return sum + w * r
    }, 0)
  }, [investmentRows, totalInvested])

  // Antigüedad media de la cartera en días
  const avgHoldingDays = useMemo(() => {
    if (investmentRows.length === 0) return 0
    const today = Date.now()
    const total = investmentRows.reduce((sum, inv) => {
      const days = Math.floor((today - new Date(inv.started_at).getTime()) / 86400000)
      return sum + days
    }, 0)
    return Math.round(total / investmentRows.length)
  }, [investmentRows])

  // Número de entidades distintas
  const distinctEntities = useMemo(
    () => new Set(investmentRows.map(i => i.investment_entity_id)).size,
    [investmentRows],
  )

  // Concentración: % del mayor instrumento
  const topInstrumentShare = useMemo(() => {
    if (investmentsByType.length === 0 || totalCurrent === 0) return 0
    return (investmentsByType[0].value / totalCurrent) * 100
  }, [investmentsByType, totalCurrent])

  const defaultBadgeStyle = { bg: 'bg-neutral-100', text: 'text-neutral-700' }
  const TTStyle = CHART_TOOLTIP_STYLE

  if (loading) return (
    <div className="flex items-center justify-center h-56">
      <LoadingSpinner size={8} />
    </div>
  )

  return (
    <>
      <FilterCard sticky>
        <div className="flex items-center justify-between w-full gap-4">
          <div className="min-w-0 flex flex-col gap-1.5">
            <p className="text-sm font-medium text-neutral-900 leading-tight">{t('dashboard.inv_quick_summary')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{t('dashboard.inv_active_positions', { count: investmentRows.length })}</Badge>
              <Badge variant={topInstrumentShare > 60 ? 'negative' : topInstrumentShare > 40 ? 'neutral' : 'positive'}>
                {t('dashboard.inv_concentration', { pct: topInstrumentShare.toFixed(1), type: investmentsByType[0]?.type ?? '—' })}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <label className="app-label">{t('dashboard.inv_currency_label')}</label>
            <Select
              value={currency}
              onChange={onCurrencyChange}
              options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }]}
              className="w-24"
            />
          </div>
        </div>
      </FilterCard>

      {/* ─── KPI strip ────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>{t('dashboard.inv_section_summary')}</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label={t('dashboard.inv_kpi_invested')}
            value={fmt(totalInvested, currency)}
            accentClass="bg-brand"
            accentRingClass="ring-2 ring-brand/20"
            valueClass="text-brand"
            sub={t('dashboard.inv_kpi_invested_sub', { count: investmentRows.length })}
            help={t('dashboard.inv_kpi_invested_help')}
          />
          <KpiCard
            label={t('dashboard.inv_kpi_current')}
            value={fmt(totalCurrent, currency)}
            accentClass="bg-success"
            accentRingClass="ring-2 ring-success/20"
            valueClass="text-success"
            sub={t('dashboard.inv_kpi_current_sub')}
            help={t('dashboard.inv_kpi_current_help')}
          />
          <KpiCard
            label={t('dashboard.inv_kpi_result')}
            value={fmt(totalReturn, currency)}
            accentClass={totalReturn >= 0 ? 'bg-success' : 'bg-warning'}
            accentRingClass={totalReturn >= 0 ? 'ring-2 ring-success/20' : 'ring-2 ring-warning/20'}
            valueClass={totalReturn >= 0 ? 'text-success' : 'text-warning'}
            sub={totalReturn >= 0 ? t('dashboard.inv_kpi_result_gain') : t('dashboard.inv_kpi_result_loss')}
            help={t('dashboard.inv_kpi_result_help')}
          />
          <KpiCard
            label={t('dashboard.inv_kpi_return')}
            value={`${totalReturnPct > 0 ? '+' : ''}${totalReturnPct.toFixed(1)}%`}
            accentClass={totalReturnPct >= 0 ? 'bg-success' : 'bg-warning'}
            accentRingClass={totalReturnPct >= 0 ? 'ring-2 ring-success/20' : 'ring-2 ring-warning/20'}
            valueClass={totalReturnPct >= 0 ? 'text-success' : 'text-warning'}
            sub={t('dashboard.inv_kpi_return_sub')}
            help={t('dashboard.inv_kpi_return_help')}
          />
        </div>

        {/* Segunda fila de KPIs — solo cuando hay datos */}
        {investmentRows.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <KpiCard
              label={t('dashboard.inv_kpi_weighted_return')}
              value={`${weightedAvgReturn >= 0 ? '+' : ''}${weightedAvgReturn.toFixed(1)}%`}
              accentClass={weightedAvgReturn >= 0 ? 'bg-success' : 'bg-warning'}
              accentRingClass={weightedAvgReturn >= 0 ? 'ring-2 ring-success/20' : 'ring-2 ring-warning/20'}
              valueClass={weightedAvgReturn >= 0 ? 'text-success' : 'text-warning'}
              sub={t('dashboard.inv_kpi_weighted_return_sub')}
              help={t('dashboard.inv_kpi_weighted_return_help')}
            />
            <KpiCard
              label={t('dashboard.inv_kpi_at_risk')}
              value={capitalAtRisk > 0 ? fmt(capitalAtRisk, currency) : '—'}
              accentClass={capitalAtRisk > 0 ? 'bg-warning' : 'bg-neutral-100'}
              accentRingClass={capitalAtRisk > 0 ? 'ring-2 ring-warning/20' : 'ring-1 ring-neutral-100'}
              valueClass={capitalAtRisk > 0 ? 'text-warning' : 'text-neutral-400'}
              sub={t('dashboard.inv_kpi_at_risk_sub', { count: investmentRows.filter(i => Number(i.current_value) < Number(i.amount_invested)).length })}
              help={t('dashboard.inv_kpi_at_risk_help')}
            />
            <KpiCard
              label={t('dashboard.inv_kpi_entities')}
              value={distinctEntities.toString()}
              accentClass="bg-brand"
              accentRingClass="ring-2 ring-brand/20"
              valueClass="text-brand"
              sub={t('dashboard.inv_kpi_entities_sub')}
              help={t('dashboard.inv_kpi_entities_help')}
            />
            <KpiCard
              label={t('dashboard.inv_kpi_avg_holding')}
              value={avgHoldingDays >= 365
                ? t('dashboard.inv_kpi_avg_holding_years', { n: (avgHoldingDays / 365).toFixed(1) })
                : t('dashboard.inv_kpi_avg_holding_days', { n: avgHoldingDays })}
              accentClass="bg-neutral-100"
              accentRingClass="ring-1 ring-neutral-100"
              valueClass="text-neutral-900"
              sub={t('dashboard.inv_kpi_avg_holding_sub')}
              help={t('dashboard.inv_kpi_avg_holding_help')}
            />
          </div>
        )}
      </section>

      {/* ─── Insights strip ───────────────────────────────────────────────── */}
      {investmentRows.length > 0 && (
        <section className="pt-1">
          <SectionTitle>{t('dashboard.inv_section_highlights')}</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {topPerformer && (() => {
              const ret = Number(topPerformer.current_value) - Number(topPerformer.amount_invested)
              const retPct = Number(topPerformer.amount_invested) > 0
                ? (ret / Number(topPerformer.amount_invested)) * 100 : 0
              const entityName = entityMap.get(topPerformer.investment_entity_id)
              return (
                <InsightCard
                  label={t('dashboard.inv_insight_top_performer')}
                  name={topPerformer.name}
                  sub={`${retPct >= 0 ? '+' : ''}${retPct.toFixed(1)}% · ${fmt(ret, currency)}${entityName ? ` · ${entityName}` : ''}`}
                  help={t('dashboard.inv_insight_top_performer_help')}
                  accentClass="border-l-success"
                />
              )
            })()}
            {worstPerformer && worstPerformer.id !== topPerformer?.id && (() => {
              const ret = Number(worstPerformer.current_value) - Number(worstPerformer.amount_invested)
              const retPct = Number(worstPerformer.amount_invested) > 0
                ? (ret / Number(worstPerformer.amount_invested)) * 100 : 0
              const entityName = entityMap.get(worstPerformer.investment_entity_id)
              return (
                <InsightCard
                  label={t('dashboard.inv_insight_worst_performer')}
                  name={worstPerformer.name}
                  sub={`${retPct >= 0 ? '+' : ''}${retPct.toFixed(1)}% · ${fmt(ret, currency)}${entityName ? ` · ${entityName}` : ''}`}
                  help={t('dashboard.inv_insight_worst_performer_help')}
                  accentClass="border-l-warning"
                />
              )
            })()}
            {largestPosition && (() => {
              const concentrationPct = totalCurrent > 0
                ? (Number(largestPosition.current_value) / totalCurrent) * 100 : 0
              const entityName = entityMap.get(largestPosition.investment_entity_id)
              return (
                <InsightCard
                  label={t('dashboard.inv_insight_largest_position')}
                  name={largestPosition.name}
                  sub={`${concentrationPct.toFixed(1)}% del portafolio · ${fmt(Number(largestPosition.current_value), currency)}${entityName ? ` · ${entityName}` : ''}`}
                  help={t('dashboard.inv_insight_largest_position_help')}
                  accentClass="border-l-brand"
                />
              )
            })()}
            {topEntity && (
              <InsightCard
                label={t('dashboard.inv_insight_top_entity')}
                name={topEntity.name}
                sub={`${totalCurrent > 0 ? `${((topEntity.value / totalCurrent) * 100).toFixed(1)}% del portafolio · ` : ''}${fmt(topEntity.value, currency)}`}
                help={t('dashboard.inv_insight_top_entity_help')}
                accentClass="border-l-neutral-400"
              />
            )}
          </div>

          {/* Segunda fila de insights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            {(() => {
              const positiveCount = investmentRows.filter(i => Number(i.current_value) >= Number(i.amount_invested)).length
              const pct = investmentRows.length > 0 ? (positiveCount / investmentRows.length) * 100 : 0
              return (
                <div className="bg-white border border-neutral-100 border-l-4 border-l-success rounded-xl p-4 shadow-sm relative transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
                  <span className="absolute top-3 right-3"><HelpTooltip text={t('dashboard.inv_insight_positive_positions_help')} /></span>
                  <p className="app-label uppercase tracking-wider mb-2">{t('dashboard.inv_insight_positive_positions')}</p>
                  <p className="text-xl font-medium text-neutral-900 leading-snug">
                    {positiveCount} <span className="text-neutral-400 font-normal text-sm">/ {investmentRows.length}</span>
                  </p>
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden mt-2">
                    <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="app-subtitle text-xs mt-1.5">{t('dashboard.inv_insight_positive_positions_sub', { pct: pct.toFixed(0) })}</p>
                </div>
              )
            })()}
            <div className="bg-white border border-neutral-100 border-l-4 border-l-neutral-400 rounded-xl p-4 shadow-sm relative transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
              <span className="absolute top-3 right-3"><HelpTooltip text={t('dashboard.inv_insight_instrument_types_help')} /></span>
              <p className="app-label uppercase tracking-wider mb-2">{t('dashboard.inv_insight_instrument_types')}</p>
              <p className="text-xl font-medium text-neutral-900 leading-snug">{investmentsByType.length}</p>
              <p className="app-subtitle text-xs mt-1.5">
                {investmentsByType.length > 0 ? t('dashboard.inv_insight_instrument_types_sub', { type: investmentsByType[0].type, pct: topInstrumentShare.toFixed(1) }) : t('dashboard.inv_insight_instrument_types_sub_empty')}
              </p>
            </div>
            {oldestPosition && (() => {
              const entityName = entityMap.get(oldestPosition.investment_entity_id)
              return (
                <InsightCard
                  label={t('dashboard.inv_insight_oldest')}
                  name={oldestPosition.name}
                  sub={`${t('dashboard.inv_insight_oldest_sub', { date: fmtDate(oldestPosition.started_at) })}${entityName ? ` · ${entityName}` : ''}`}
                  help={t('dashboard.inv_insight_oldest_help')}
                  accentClass="border-l-neutral-400"
                />
              )
            })()}
            <div className={`bg-white border border-neutral-100 border-l-4 ${
              investmentsByType.length >= 4 ? 'border-l-success'
              : investmentsByType.length >= 2 ? 'border-l-warning'
              : 'border-l-brand'
            } rounded-xl p-4 shadow-sm relative transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md`}>
              <span className="absolute top-3 right-3"><HelpTooltip text={t('dashboard.inv_insight_diversification_help')} /></span>
              <p className="app-label uppercase tracking-wider mb-2">{t('dashboard.inv_insight_diversification')}</p>
              <p className={`text-xl font-medium leading-snug ${
                investmentsByType.length >= 4 ? 'text-success'
                : investmentsByType.length >= 2 ? 'text-warning'
                : 'text-brand'
              }`}>
                {investmentsByType.length >= 4 ? t('dashboard.inv_insight_diversification_high')
                  : investmentsByType.length >= 2 ? t('dashboard.inv_insight_diversification_med')
                  : investmentsByType.length === 1 ? t('dashboard.inv_insight_diversification_low')
                  : '—'}
              </p>
              <p className="app-subtitle text-xs mt-1.5">
                {distinctEntities} {distinctEntities === 1 ? 'entidad' : 'entidades'} · {investmentsByType.length} {investmentsByType.length === 1 ? 'instrumento' : 'instrumentos'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ─── Distribution section ─────────────────────────────────────────── */}
      <section className="pt-1">
        <SectionTitle help={t('dashboard.inv_dist_help')}>{t('dashboard.inv_section_distribution')}</SectionTitle>
        <div className="app-panel p-5">
          {investmentsByType.length === 0 ? (
            <p className="app-subtitle text-sm">{t('dashboard.inv_dist_empty', { currency })}</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* Donut chart */}
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={investmentsByType}
                      dataKey="value"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      label={false}
                    >
                      {investmentsByType.map((item) => (
                        <Cell
                          key={item.type}
                          fill={INSTRUMENT_FILL_COLORS[item.type] ?? 'var(--af-text-muted)'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      {...TTStyle}
                      formatter={(value) => [fmt(Number(value ?? 0), currency), t('dashboard.inv_dist_tooltip_label')]}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Progress bars */}
              <div className="space-y-3">
                {investmentsByType.map((item) => {
                  const share = totalCurrent > 0 ? (item.value / totalCurrent) * 100 : 0
                  const badge = INSTRUMENT_COLORS[item.type] ?? defaultBadgeStyle
                  const progressClass = INSTRUMENT_PROGRESS_COLORS[item.type] ?? 'bg-neutral-400'
                  return (
                    <div key={item.type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {item.type}
                        </span>
                        <span className="text-neutral-900 font-medium">
                          {fmt(item.value, currency)}
                          <span className="text-neutral-400 font-normal ml-1.5">({share.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div className={`h-full ${progressClass}`} style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Positions table ──────────────────────────────────────────────── */}
      <section className="pt-1">
        <SectionTitle help={t('dashboard.inv_pos_help')}>{t('dashboard.inv_section_positions')}</SectionTitle>
        <div className="app-panel p-0 overflow-hidden">
          {investmentRows.length === 0 ? (
            <div className="p-8 text-center app-subtitle">
              <p className="text-sm">{t('dashboard.inv_pos_empty', { currency })}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">{t('dashboard.inv_col_investment')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">{t('dashboard.inv_col_type')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-widest uppercase text-neutral-700">{t('dashboard.inv_col_entity')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-widest uppercase text-neutral-700">{t('dashboard.inv_col_invested')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-widest uppercase text-neutral-700">{t('dashboard.inv_col_current')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-widest uppercase text-neutral-700">{t('dashboard.inv_col_result')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-widest uppercase text-neutral-700">{t('dashboard.inv_col_return')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-widest uppercase text-neutral-700">{t('dashboard.inv_col_start')}</th>
                  </tr>
                </thead>
                <tbody>
                  {investmentRows.map((investment) => {
                    const result = Number(investment.current_value) - Number(investment.amount_invested)
                    const retPct = Number(investment.amount_invested) > 0
                      ? (result / Number(investment.amount_invested)) * 100
                      : 0
                    const badge = INSTRUMENT_COLORS[investment.instrument_type] ?? defaultBadgeStyle
                    const entityName = entityMap.get(investment.investment_entity_id)
                    return (
                      <tr key={investment.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-neutral-900 font-medium">{investment.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                            {investment.instrument_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700">{entityName ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-right text-neutral-700">{fmt(Number(investment.amount_invested), currency)}</td>
                        <td className="px-4 py-3 text-sm text-right text-neutral-900 font-medium">{fmt(Number(investment.current_value), currency)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${result >= 0 ? 'text-success' : 'text-warning'}`}>
                          {result >= 0 ? '+' : ''}{fmt(result, currency)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${retPct >= 0 ? 'text-success' : 'text-warning'}`}>
                          {retPct >= 0 ? '+' : ''}{retPct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-neutral-400">{fmtDateNumeric(investment.started_at)}</td>
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

