import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
import FilterCard from '@/components/ui/FilterCard'
import InlineAlert from '@/components/ui/InlineAlert'
import PageSkeleton from '@/components/ui/PageSkeleton'
import { useSmartAlertsData } from '@/hooks/useSmartAlertsData'
import { trackUxEvent } from '@/lib/uxTelemetry'
import { formatCurrency } from '@/lib/utils'
import type { SmartAlertItem, SmartAlertsKpiItem } from '@/types'
import ViewToggle from '@/components/ui/ViewToggle'

const ALERT_PREFERENCES_KEY = 'atlasfinance.smartAlerts.preferences'

interface AlertPreferences {
  budget: boolean
  reminders: boolean
  atypical: boolean
}

function loadPreferences(): AlertPreferences {
  if (typeof window === 'undefined') return { budget: true, reminders: true, atypical: true }
  const raw = window.localStorage.getItem(ALERT_PREFERENCES_KEY)
  if (!raw) return { budget: true, reminders: true, atypical: true }

  try {
    const parsed = JSON.parse(raw) as AlertPreferences
    return {
      budget: parsed.budget ?? true,
      reminders: parsed.reminders ?? true,
      atypical: parsed.atypical ?? true,
    }
  } catch {
    return { budget: true, reminders: true, atypical: true }
  }
}

function isAlertEnabled(alert: SmartAlertItem, preferences: AlertPreferences): boolean {
  if (alert.code.startsWith('budget_')) return preferences.budget
  if (alert.code.startsWith('fixed_payment_')) return preferences.reminders
  if (alert.code === 'atypical_movement') return preferences.atypical
  return true
}

function getLocalizedSeverityLabel(severity: string, t: (key: string) => string): string {
  if (severity === 'high') return t('planning.alerts.severity_high')
  if (severity === 'medium') return t('planning.alerts.severity_medium')
  if (severity === 'low') return t('planning.alerts.severity_low')
  return severity
}

function getLocalizedAlertText(alert: SmartAlertItem, t: (key: string, options?: Record<string, unknown>) => string): { title: string; detail: string } {
  switch (alert.code) {
    case 'budget_overrun':
      return {
        title: t('planning.alerts.code_budget_overrun_title'),
        detail: t('planning.alerts.code_budget_overrun_detail'),
      }
    case 'budget_near_limit':
      return {
        title: t('planning.alerts.code_budget_near_limit_title'),
        detail: t('planning.alerts.code_budget_near_limit_detail'),
      }
    case 'fixed_payment_due_soon':
      return {
        title: t('planning.alerts.code_fixed_payment_due_soon_title'),
        detail: t('planning.alerts.code_fixed_payment_due_soon_detail'),
      }
    case 'fixed_payment_overdue':
      return {
        title: t('planning.alerts.code_fixed_payment_overdue_title'),
        detail: t('planning.alerts.code_fixed_payment_overdue_detail'),
      }
    case 'atypical_movement':
      return {
        title: t('planning.alerts.code_atypical_movement_title'),
        detail: t('planning.alerts.code_atypical_movement_detail'),
      }
    default:
      return {
        title: alert.title,
        detail: alert.detail,
      }
  }
}

function getLocalizedKpiText(
  kpi: SmartAlertsKpiItem,
  t: (key: string, options?: Record<string, unknown>) => string,
): { title: string; description: string; unit: string } {
  const titleKey = `planning.alerts.kpi_${kpi.key}_title`
  const descriptionKey = `planning.alerts.kpi_${kpi.key}_description`
  const unitKey = `planning.alerts.kpi_unit_${kpi.unit}`

  const localizedTitle = t(titleKey)
  const localizedDescription = t(descriptionKey)
  const localizedUnit = t(unitKey)

  return {
    title: localizedTitle === titleKey ? kpi.title : localizedTitle,
    description: localizedDescription === descriptionKey ? kpi.description : localizedDescription,
    unit: localizedUnit === unitKey ? kpi.unit : localizedUnit,
  }
}

function getKpiCardVisuals(kpiKey: string): {
  accent: string
  value: string
} {
  if (kpiKey === 'users_activating_alerts') {
    return {
      accent: 'bg-brand',
      value: 'text-brand',
    }
  }
  if (kpiKey === 'reduction_of_omitted_charges') {
    return {
      accent: 'bg-warning',
      value: 'text-warning-text',
    }
  }
  if (kpiKey === 'subscription_cancellation_rate') {
    return {
      accent: 'bg-success',
      value: 'text-success-text',
    }
  }
  return {
    accent: 'bg-neutral-100',
    value: 'text-neutral-900',
  }
}

function getSeverityClasses(severity: string): { chip: string; border: string; soft: string } {
  if (severity === 'high') {
    return { chip: 'bg-[#f5bcbc] text-[#7a0505]', border: 'border-l-brand', soft: 'bg-brand-light/40' }
  }
  if (severity === 'medium') {
    return { chip: 'bg-[#ffd98a] text-[#6b4000]', border: 'border-l-warning', soft: 'bg-warning-bg/30' }
  }
  return { chip: 'bg-[#b8e3d4] text-[#0a4a32]', border: 'border-l-success', soft: 'bg-success-bg/30' }
}

function getDaysToDate(isoDate?: string | null): number | null {
  if (!isoDate) return null
  const now = new Date()
  const target = new Date(isoDate)
  if (Number.isNaN(target.getTime())) return null
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const diffMs = targetOnly.getTime() - nowOnly.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function formatIsoDate(isoDate?: string | null): string {
  if (!isoDate) return '-'
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed)
}

export default function SmartAlertsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [preferences, setPreferences] = useState<AlertPreferences>(loadPreferences)
  const [alertViewMode, setAlertViewMode] = useState<'grid' | 'table'>('grid')
  const { data, loading } = useSmartAlertsData()

  const activeAlerts = useMemo(
    () => (data?.alerts ?? []).filter((alert) => isAlertEnabled(alert, preferences)),
    [data?.alerts, preferences],
  )

  const detectedAlertsCount = data?.alerts.length ?? 0
  const preferenceFiltersHideAlerts = detectedAlertsCount > 0 && activeAlerts.length === 0
  const dueSoonSubscriptionsCount = useMemo(
    () => (data?.subscriptions ?? []).filter((subscription) => {
      const days = getDaysToDate(subscription.next_due_date)
      return days !== null && days >= 0 && days <= 7
    }).length,
    [data?.subscriptions],
  )
  const hasDisabledPreferences = !preferences.budget || !preferences.reminders || !preferences.atypical

  const setPreference = (key: keyof AlertPreferences, enabled: boolean) => {
    const next = { ...preferences, [key]: enabled }
    setPreferences(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ALERT_PREFERENCES_KEY, JSON.stringify(next))
    }
    trackUxEvent('smart_alerts_toggle_changed', {
      key,
      enabled,
    })
  }

  const enableAllAlertTypes = () => {
    const next = { budget: true, reminders: true, atypical: true }
    setPreferences(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ALERT_PREFERENCES_KEY, JSON.stringify(next))
    }
    trackUxEvent('smart_alerts_enable_all', { source: 'empty_state' })
  }

  const resolveAlertAction = (alert: SmartAlertItem): { label: string; to: string } | null => {
    if (alert.code.startsWith('budget_')) {
      return { label: t('planning.alerts.action_open_budgets'), to: '/planning/budgets' }
    }
    if (alert.code.startsWith('fixed_payment_')) {
      return { label: t('planning.alerts.action_open_transactions'), to: '/transactions' }
    }
    if (alert.code === 'atypical_movement') {
      return { label: t('planning.alerts.action_open_transactions'), to: '/transactions' }
    }
    return null
  }

  if (loading) {
    return <PageSkeleton cards={3} rows={4} columns={4} />
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] rounded-2xl p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">{t('planning.alerts.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">{t('planning.alerts.subtitle')}</p>
      </div>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <article className="group relative overflow-hidden rounded-2xl border border-warning/30 bg-gradient-to-b from-warning-bg/55 to-white p-4 md:p-5 shadow-sm ring-1 ring-warning/20 transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-warning/50 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1.5 bg-warning" />
            <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-warning-bg blur-2xl" aria-hidden="true" />
            <div className="relative flex items-start justify-between gap-2">
              <p className="app-label uppercase tracking-wide text-warning-text">{t('planning.alerts.alerts_title')}</p>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warning text-white">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                  <path d="M4 10h12M10 4v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </div>
            <p className="relative mt-3 text-3xl leading-none font-medium text-warning-text">{activeAlerts.length}</p>
            <p className="relative mt-2 text-xs text-neutral-400">{detectedAlertsCount} {t('planning.alerts.filter_all').toLowerCase()}</p>
          </article>
          <article className="group relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-b from-success-bg/70 to-white p-4 md:p-5 shadow-sm ring-1 ring-success/20 transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-success/50 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1.5 bg-success" />
            <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-success-bg blur-2xl" aria-hidden="true" />
            <div className="relative flex items-start justify-between gap-2">
              <p className="app-label uppercase tracking-wide text-success-text">{t('planning.alerts.subscriptions_title')}</p>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-success text-white">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                  <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </div>
            <p className="relative mt-3 text-3xl leading-none font-medium text-success-text">{data?.subscriptions.length ?? 0}</p>
            <p className="relative mt-2 text-xs text-neutral-400">{t('planning.alerts.next_7_days_count', { count: dueSoonSubscriptionsCount })}</p>
          </article>
          <article className="group relative overflow-hidden rounded-2xl border border-brand/35 bg-gradient-to-b from-brand-light/60 to-white p-4 md:p-5 shadow-sm ring-1 ring-brand/20 transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-brand/55 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1.5 bg-brand" />
            <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-brand-light/80 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-start justify-between gap-2">
              <p className="app-label uppercase tracking-wide text-brand-text">{t('planning.alerts.annual_total')}</p>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light text-brand">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                  <path d="M10 3v14M7 6.5C7 5.12 8.34 4 10 4s3 1.12 3 2.5S11.66 9 10 9s-3 1.12-3 2.5S8.34 14 10 14s3-1.12 3-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </div>
            <p className="relative mt-3 text-[1.85rem] leading-none font-medium tracking-tight text-brand-text">
              {formatCurrency(Number(data?.subscriptions_annual_total ?? 0), 'COP')}
            </p>
          </article>
        </div>
      </section>

      <section className="space-y-2">
        <FilterCard
          activeFilters={[]}
          onReset={undefined}
          className="gap-3"
        >
          <div className="w-full space-y-2">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center">
              {t('planning.alerts.switches_title')}
            </span>
            <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'budget' as const, label: t('planning.alerts.switch_budget') },
                  { key: 'reminders' as const, label: t('planning.alerts.switch_reminders') },
                  { key: 'atypical' as const, label: t('planning.alerts.switch_atypical') },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPreference(item.key, !preferences[item.key])}
                    aria-pressed={preferences[item.key]}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 ${
                      preferences[item.key]
                        ? 'bg-brand text-white hover:bg-brand-hover'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {hasDisabledPreferences && (
                <button
                  type="button"
                  onClick={enableAllAlertTypes}
                  className="md:ml-auto rounded-md border border-brand bg-brand px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-hover hover:border-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
                >
                  {t('planning.alerts.enable_all')}
                </button>
              )}
            </div>
          </div>
        </FilterCard>
      </section>

      <section className="app-card rounded-2xl p-4 md:p-5 space-y-3">
        <h2 className="app-section-title">{t('planning.alerts.guide_title')}</h2>
        <p className="text-sm text-neutral-700">{t('planning.alerts.guide_subtitle')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <article className="bg-white border border-neutral-100 rounded-xl p-4 shadow-sm relative transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md border-l-4 border-l-brand ring-1 ring-brand/20">
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: '#8a0808' }}>{t('planning.alerts.guide_high_title')}</p>
            <p className="mt-1 text-sm text-neutral-900 leading-snug">{t('planning.alerts.guide_high_body')}</p>
          </article>
          <article className="bg-white border border-neutral-100 rounded-xl p-4 shadow-sm relative transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md border-l-4 border-l-warning ring-1 ring-warning/20">
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: '#8a5200' }}>{t('planning.alerts.guide_medium_title')}</p>
            <p className="mt-1 text-sm text-neutral-900 leading-snug">{t('planning.alerts.guide_medium_body')}</p>
          </article>
          <article className="bg-white border border-neutral-100 rounded-xl p-4 shadow-sm relative transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md border-l-4 border-l-success ring-1 ring-success/20">
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: '#0f5c40' }}>{t('planning.alerts.guide_low_title')}</p>
            <p className="mt-1 text-sm text-neutral-900 leading-snug">{t('planning.alerts.guide_low_body')}</p>
          </article>
        </div>
      </section>

      <section className="space-y-3">
        {activeAlerts.length === 0 && (
          <div className="app-card rounded-2xl p-4 md:p-5 space-y-3">
            <h2 className="app-section-title">{t('planning.alerts.alerts_title')}</h2>
            <InlineAlert
              message={
                preferenceFiltersHideAlerts
                  ? t('planning.alerts.hidden_by_filters')
                  : t('planning.alerts.empty_alerts')
              }
              variant="info"
            />
            {preferenceFiltersHideAlerts && (
              <button
                type="button"
                onClick={enableAllAlertTypes}
                className="rounded-md border border-brand bg-brand px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-hover hover:border-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
              >
                {t('planning.alerts.enable_all')}
              </button>
            )}
          </div>
        )}

        {activeAlerts.length > 0 && (
          <div className="app-card rounded-2xl bg-gradient-to-b from-white to-neutral-50/70 p-3 ring-1 ring-neutral-100/70 space-y-3">
            <h2 className="app-section-title">{t('planning.alerts.alerts_title')}</h2>
            <div className="flex items-center justify-start gap-2">
              <ViewToggle
                value={alertViewMode}
                onChange={(m) => setAlertViewMode(m as 'grid' | 'table')}
                options={[
                  { value: 'grid', labelKey: 'common.view_cards', icon: '⊞' },
                  { value: 'table', labelKey: 'common.view_table', icon: '≡' },
                ]}
              />
            </div>

            {alertViewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {activeAlerts.map((alert, index) => {
          const action = resolveAlertAction(alert)
          const severityUi = getSeverityClasses(alert.severity)

          return (
            <article
              key={`${alert.code}-${alert.transaction_id ?? index}`}
              className={`relative overflow-hidden rounded-2xl border border-neutral-100 border-l-4 bg-gradient-to-b from-white to-neutral-50/70 p-3 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md ${severityUi.border} ${severityUi.soft}`}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-white/70" aria-hidden="true" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${severityUi.chip}`}>
                    {getLocalizedSeverityLabel(alert.severity, t)}
                  </span>
                  {alert.due_date && (
                    <Badge variant={alert.severity === 'high' ? 'warning' : 'neutral'}>
                      {formatIsoDate(alert.due_date)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-neutral-900 leading-tight">{getLocalizedAlertText(alert, t).title}</p>
                <p className="text-xs text-neutral-700 leading-tight">{getLocalizedAlertText(alert, t).detail}</p>
                {alert.amount && (
                  <p className="text-xs font-medium text-neutral-900">{formatCurrency(Number(alert.amount), 'COP')}</p>
                )}
              </div>
              {action && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      trackUxEvent('smart_alert_action_clicked', { code: alert.code, to: action.to })
                      navigate(action.to)
                    }}
                    className="rounded-md border border-neutral-100 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition-all hover:-translate-y-0.5 hover:border-brand hover:text-brand hover:shadow-sm"
                  >
                    {action.label}
                  </button>
                </div>
              )}
            </article>
          )
          })}
        </div>        ) : (
            <div className="app-table-wrap overflow-x-auto">
              <table className="app-table smart-alerts-table table-auto text-sm min-w-[880px]">
                <colgroup>
                  <col className="w-[10%]" />
                  <col className="w-[21%]" />
                  <col className="w-[32%]" />
                  <col className="w-[16%]" />
                  <col className="w-[9%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="bg-brand text-white">
                  <tr>
                    <th className="px-3 py-2.5 text-center font-medium align-middle whitespace-nowrap">{t('planning.alerts.severity_label')}</th>
                    <th className="px-3 py-2.5 text-center font-medium align-middle whitespace-nowrap">{t('common.title')}</th>
                    <th className="px-3 py-2.5 text-center font-medium align-middle">{t('common.detail')}</th>
                    <th className="col-amount px-3 py-2.5 text-center font-medium align-middle whitespace-nowrap">{t('common.amount')}</th>
                    <th className="col-due px-3 py-2.5 text-center font-medium align-middle whitespace-nowrap">{t('planning.alerts.due_short')}</th>
                    <th className="px-3 py-2.5 text-center font-medium align-middle whitespace-nowrap">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAlerts.map((alert, index) => {
                    const action = resolveAlertAction(alert)
                    const severityUi = getSeverityClasses(alert.severity)
                    return (
                      <tr
                        key={`${alert.code}-${alert.transaction_id ?? index}`}
                        className={`border-b border-neutral-100 transition-colors hover:bg-brand-light/25 ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/60'}`}
                      >
                        <td className="px-3 py-2.5 text-center align-middle">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${severityUi.chip}`}>
                            {getLocalizedSeverityLabel(alert.severity, t)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-neutral-900 font-medium align-middle">{getLocalizedAlertText(alert, t).title}</td>
                        <td className="px-3 py-2.5 text-neutral-700 text-sm leading-relaxed" title={getLocalizedAlertText(alert, t).detail}>{getLocalizedAlertText(alert, t).detail}</td>
                        <td className="col-amount px-3 py-2.5 text-neutral-900 font-medium align-middle whitespace-nowrap">{alert.amount ? formatCurrency(Number(alert.amount), 'COP') : '-'}</td>
                        <td className="col-due px-3 py-2.5 text-neutral-700 align-middle whitespace-nowrap">
                          {alert.due_date ? (
                            <Badge variant={alert.severity === 'high' ? 'warning' : 'neutral'}>
                              {formatIsoDate(alert.due_date)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-neutral-500">{t('planning.alerts.no_due_date')}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center align-middle whitespace-nowrap">
                          {action && (
                            <button
                              type="button"
                              onClick={() => {
                                trackUxEvent('smart_alert_action_clicked', { code: alert.code, to: action.to })
                                navigate(action.to)
                              }}
                              className="rounded-md border border-neutral-100 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-all hover:border-brand hover:text-brand hover:shadow-sm"
                            >
                              {action.label}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}      </section>

      <section className="space-y-3">
        {!data?.subscriptions.length && (
          <div className="app-card rounded-2xl p-4 md:p-5 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="app-section-title">{t('planning.alerts.subscriptions_title')}</h2>
              <div className="flex items-center gap-2">
                <Badge variant={dueSoonSubscriptionsCount > 0 ? 'warning' : 'positive'}>{t('planning.alerts.due_soon_count', { count: dueSoonSubscriptionsCount })}</Badge>
              </div>
            </div>
            <InlineAlert message={t('planning.alerts.empty_subscriptions')} variant="info" />
          </div>
        )}

        {!!data?.subscriptions.length && (
          <div className="app-card rounded-2xl bg-gradient-to-b from-white to-neutral-50/70 p-3 ring-1 ring-neutral-100/70 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2 px-1">
              <h2 className="app-section-title">{t('planning.alerts.subscriptions_title')}</h2>
              <div className="flex items-center gap-2">
                <Badge variant={dueSoonSubscriptionsCount > 0 ? 'warning' : 'positive'}>{t('planning.alerts.due_soon_count', { count: dueSoonSubscriptionsCount })}</Badge>
              </div>
            </div>
            <div className="space-y-3 md:hidden">
              {data.subscriptions.map((subscription) => (
                <article key={subscription.key} className="rounded-2xl border border-neutral-100 bg-gradient-to-b from-white to-neutral-50/70 p-4 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-neutral-900">{subscription.name}</p>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${ (getDaysToDate(subscription.next_due_date) ?? 999) <= 7 ? 'bg-[#f5bcbc] text-[#7a0505]' : (getDaysToDate(subscription.next_due_date) ?? 999) <= 30 ? 'bg-[#ffd98a] text-[#6b4000]' : 'bg-[#b8e3d4] text-[#0a4a32]' }`}>{formatIsoDate(subscription.next_due_date)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-700">
                    <p>{t('planning.alerts.sub_monthly')}</p>
                    <p className="text-right font-medium text-neutral-900">
                      {formatCurrency(Number(subscription.monthly_estimate), 'COP')}
                    </p>
                    <p>{t('planning.alerts.sub_annual')}</p>
                    <p className="text-right font-medium text-brand-deep">
                      {formatCurrency(Number(subscription.annual_cost), 'COP')}
                    </p>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>{t('planning.alerts.confidence_label')}</span>
                      <span>{Math.round(Number(subscription.confidence) * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.min(100, Math.max(0, Math.round(Number(subscription.confidence) * 100)))}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        trackUxEvent('smart_subscription_action_clicked', {
                          name: subscription.name,
                          to: '/transactions',
                        })
                        navigate(`/transactions?q=${encodeURIComponent(subscription.name)}`)
                      }}
                      className="rounded-md border border-neutral-100 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-all hover:-translate-y-0.5 hover:border-brand hover:text-brand hover:shadow-sm"
                    >
                      {t('planning.alerts.action_open_subscription_transactions')}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block app-table-wrap overflow-x-auto">
              <table className="app-table smart-alerts-table table-auto text-sm min-w-[880px]">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[17%]" />
                  <col className="w-[17%]" />
                  <col className="w-[20%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead className="bg-brand text-white">
                <tr>
                  <th className="px-3 py-2.5 text-center font-medium align-middle whitespace-nowrap">{t('planning.alerts.sub_name')}</th>
                  <th className="px-3 py-2.5 text-center font-medium align-middle whitespace-nowrap">{t('planning.alerts.sub_monthly')}</th>
                  <th className="px-3 py-2.5 text-center font-medium align-middle whitespace-nowrap">{t('planning.alerts.sub_annual')}</th>
                  <th className="px-3 py-2.5 text-center font-medium align-middle whitespace-nowrap">{t('planning.alerts.sub_next_due')}</th>
                  <th className="px-3 py-2.5 text-center font-medium align-middle whitespace-nowrap">{t('planning.alerts.sub_actions')}</th>
                </tr>
                </thead>
                <tbody>
                  {data.subscriptions.map((subscription, index) => (
                    <tr
                      key={subscription.key}
                      className={`border-b border-neutral-100 transition-colors hover:bg-brand-light/25 ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/60'}`}
                    >
                      <td className="px-3 py-2.5 text-neutral-900 align-middle">{subscription.name}</td>
                      <td className="px-3 py-2.5 text-neutral-900 font-medium align-middle whitespace-nowrap">{formatCurrency(Number(subscription.monthly_estimate), 'COP')}</td>
                      <td className="px-3 py-2.5 text-neutral-900 font-medium align-middle whitespace-nowrap">{formatCurrency(Number(subscription.annual_cost), 'COP')}</td>
                      <td className="px-3 py-2.5 text-neutral-700 align-middle whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${ (getDaysToDate(subscription.next_due_date) ?? 999) <= 7 ? 'bg-[#f5bcbc] text-[#7a0505]' : (getDaysToDate(subscription.next_due_date) ?? 999) <= 30 ? 'bg-[#ffd98a] text-[#6b4000]' : 'bg-[#b8e3d4] text-[#0a4a32]' }`}>
                          {formatIsoDate(subscription.next_due_date)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            trackUxEvent('smart_subscription_action_clicked', {
                              name: subscription.name,
                              to: '/transactions',
                            })
                            navigate(`/transactions?q=${encodeURIComponent(subscription.name)}`)
                          }}
                          className="inline-flex items-center justify-center rounded-md border border-neutral-100 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-all hover:-translate-y-0.5 hover:border-brand hover:text-brand hover:shadow-sm"
                        >
                          {t('planning.alerts.action_open_subscription_transactions')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="app-card rounded-2xl p-4 md:p-5 space-y-3">
        <h2 className="app-section-title">{t('planning.alerts.kpis_title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(data?.kpis ?? []).map((kpi) => {
            const localized = getLocalizedKpiText(kpi, t)
            const visuals = getKpiCardVisuals(kpi.key)
            return (
              <article key={kpi.key} className="app-card relative p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${visuals.accent}`} />
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="app-label uppercase tracking-wider">{localized.title}</p>
                </div>

                <p className={`text-2xl font-medium leading-none ${visuals.value}`}>{kpi.value}</p>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <p className="app-subtitle text-xs leading-snug">{localized.description}</p>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 uppercase tracking-wide">
                    {localized.unit}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
