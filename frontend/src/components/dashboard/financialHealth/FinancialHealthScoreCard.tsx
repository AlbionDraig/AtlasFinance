import type { FinancialHealthSnapshot } from '@/types'
import { scoreLevelLabel } from './helpers'
import { FinancialHealthHelpTooltip } from './shared'
import type { DeltaBadge } from './types'

interface FinancialHealthScoreCardProps {
  financialHealth: FinancialHealthSnapshot | null
  historyCount: number
  deltaBadge: DeltaBadge
  t: (key: string, params?: Record<string, string | number>) => string
  compact?: boolean
}

type MiniCardTone = DeltaBadge['tone']

interface MiniCard {
  label: string
  help: string
  value: string
  tone: MiniCardTone
}

export default function FinancialHealthScoreCard({
  financialHealth,
  historyCount,
  deltaBadge,
  t,
  compact = false,
}: FinancialHealthScoreCardProps) {
  const healthScore = financialHealth?.score ?? 0
  const healthLevel = financialHealth?.level ?? 'attention'
  const factors = financialHealth?.factors ?? []
  const factorCount = factors.length
  const strengths = factors.filter((factor) => factor.score >= 80).length
  const focus = factors.filter((factor) => factor.score < 60).length
  const levelCls = {
    strong: 'bg-success-bg text-success-text',
    stable: 'bg-brand-light text-brand-text',
    attention: 'bg-warning-bg text-warning-text',
  }[healthLevel]

  const miniCards: MiniCard[] = [
    {
      label: t('dashboard.health_mini_delta'),
      help: t('dashboard.health_mini_delta_help'),
      value: deltaBadge.text,
      tone: deltaBadge.tone,
    },
    {
      label: t('dashboard.health_mini_strengths'),
      help: t('dashboard.health_mini_strengths_help'),
      value: String(strengths),
      tone: strengths >= Math.max(1, Math.ceil(factorCount / 2)) ? 'positive' : strengths > 0 ? 'flat' : 'negative',
    },
    {
      label: t('dashboard.health_mini_focus'),
      help: t('dashboard.health_mini_focus_help'),
      value: String(focus),
      tone: focus === 0 ? 'positive' : focus === 1 ? 'flat' : 'negative',
    },
  ]

  const toneClass = {
    positive: 'text-success',
    negative: 'text-warning',
    flat: 'text-neutral-700',
    neutral: 'text-neutral-900',
  }

  const toneBadgeClass = {
    positive: 'bg-success-bg/70 text-success-text ring-success/10',
    negative: 'bg-warning-bg/70 text-warning-text ring-warning/10',
    flat: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
    neutral: 'bg-neutral-50 text-neutral-700 ring-neutral-100',
  }

  if (compact) {
    return (
      <div className="app-card w-full ring-2 ring-brand/20 relative overflow-hidden bg-gradient-to-br from-brand-light/70 via-white to-white">
        <div className="absolute top-0 left-0 right-0 h-1 bg-brand" />

        <div className="px-3.5 pt-3.5 pb-2.5 md:pb-3 space-y-3 md:space-y-0">
          <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_minmax(0,1fr)_minmax(360px,1fr)] items-start md:items-center gap-3">
            <div
              className="h-16 w-16 flex-shrink-0 rounded-full p-1"
              style={{
                background: `conic-gradient(var(--af-brand) ${Math.max(0, Math.min(100, healthScore))}%, rgba(214, 223, 230, 0.45) 0%)`,
              }}
            >
              <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-brand text-3xl font-bold">
                {healthScore}
              </div>
            </div>

            <div className="min-w-0 space-y-1.5 pt-0.5 self-start">
              <p className="app-label text-[10px] uppercase tracking-wider text-neutral-600">
                {t('dashboard.health_score_title')}
              </p>
              <span className={`inline-block pl-0 pr-2 py-0.5 text-sm font-semibold rounded-md leading-tight ${levelCls}`}>
                {healthLevel === 'strong'
                  ? t('dashboard.health_state_strong')
                  : healthLevel === 'stable'
                    ? t('dashboard.health_state_stable')
                    : t('dashboard.health_state_attention')}
              </span>
              <p className="app-subtitle text-sm leading-snug text-neutral-700">{scoreLevelLabel(healthLevel, t)}</p>
            </div>

            <div className="hidden md:grid grid-cols-3 gap-1.5 self-center">
              {miniCards.map((card) => (
                <div key={card.label} className="relative rounded-md border border-neutral-100 bg-white/90 px-2.5 py-1.5 text-center shadow-sm flex flex-col items-center justify-start gap-0.5">
                  <span className="absolute top-1.5 right-1.5 opacity-80">
                    <FinancialHealthHelpTooltip text={card.help} compact />
                  </span>
                  <p className="app-label text-[10px] uppercase tracking-wider text-neutral-500 leading-tight">{card.label}</p>
                  <p className={`text-base font-bold leading-tight tabular-nums ${toneClass[card.tone]}`}>{card.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 md:hidden">
            {miniCards.map((card) => (
              <div key={card.label} className="relative rounded-md border border-neutral-100 bg-white/90 px-2.5 py-1.5 text-center shadow-sm flex flex-col items-center justify-start gap-0.5">
                <span className="absolute top-1.5 right-1.5 opacity-80">
                  <FinancialHealthHelpTooltip text={card.help} compact />
                </span>
                <p className="app-label text-[10px] uppercase tracking-wider text-neutral-500 leading-tight">{card.label}</p>
                <p className={`text-base font-bold leading-tight tabular-nums ${toneClass[card.tone]}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-card p-5 col-span-1 lg:max-w-[360px] lg:justify-self-center min-h-[360px] w-full ring-2 ring-brand/20 relative overflow-hidden bg-gradient-to-br from-brand-light/70 via-white to-white motion-safe:transition-all motion-safe:duration-300 hover:shadow-md">
      <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-brand/10 blur-2xl" />
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand" />
      <div className="flex items-center gap-3 mb-3 relative">
        <p className="app-label uppercase tracking-wider">{t('dashboard.health_score_title')}</p>
      </div>

      <div className="mb-3 flex items-center justify-center">
        <span className={`px-2 py-1 text-[11px] font-medium rounded-full ${levelCls}`}>
          {healthLevel === 'strong'
            ? t('dashboard.health_state_strong')
            : healthLevel === 'stable'
              ? t('dashboard.health_state_stable')
              : t('dashboard.health_state_attention')}
        </span>
      </div>

      <div className="flex flex-col items-center text-center gap-3 relative min-h-[120px] justify-center">
        <div
          className="h-24 w-24 rounded-full p-1.5"
          style={{
            background: `conic-gradient(var(--af-brand) ${Math.max(0, Math.min(100, healthScore))}%, rgba(214, 223, 230, 0.45) 0%)`,
          }}
        >
          <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-brand text-3xl font-medium">
            {healthScore}
          </div>
        </div>
        <div className="space-y-1">
          <p className="app-subtitle text-sm leading-snug max-w-[18rem] mx-auto">{scoreLevelLabel(healthLevel, t)}</p>
          <p className="text-xs text-neutral-700/90">
            {t('dashboard.health_history_title')}: {historyCount}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {miniCards.map((card) => (
          <div key={card.label} className="relative rounded-lg border border-neutral-100 bg-white/90 px-2.5 py-1.5 text-center shadow-sm flex flex-col items-center justify-start gap-0.5">
            <span className="absolute top-1.5 right-1.5 opacity-80">
              <FinancialHealthHelpTooltip text={card.help} compact />
            </span>
            <p className="app-label text-[10px] uppercase tracking-wider leading-tight">{card.label}</p>
            <p className={`text-sm font-bold leading-tight tabular-nums ${toneClass[card.tone]}`}>{card.value}</p>
            <span className={`mt-0.5 inline-flex h-1.5 w-10 rounded-full ${toneBadgeClass[card.tone]}`} />
          </div>
        ))}
      </div>
    </div>
  )
}
