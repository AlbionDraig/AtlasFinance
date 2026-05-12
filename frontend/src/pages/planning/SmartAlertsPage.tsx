import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
import InlineAlert from '@/components/ui/InlineAlert'
import PageSkeleton from '@/components/ui/PageSkeleton'
import ViewToggle from '@/components/ui/ViewToggle'
import { useSmartAlertsData } from '@/hooks/useSmartAlertsData'
import { trackUxEvent } from '@/lib/uxTelemetry'
import { formatCurrency } from '@/lib/utils'
import type { SmartAlertItem, SmartAlertsKpiItem } from '@/types'

const ALERT_PREFERENCES_KEY = 'atlasfinance.smartAlerts.preferences'

interface AlertPreferences {
  budget: boolean
  reminders: boolean
  atypical: boolean
}

type AlertSeverityFilter = 'all' | 'high' | 'medium' | 'low'

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

function getSeverityClasses(severity: string): { badge: 'warning' | 'neutral' | 'positive'; border: string; soft: string } {
  if (severity === 'high') {
    return { badge: 'warning', border: 'border-l-warning', soft: 'bg-warning-bg/30' }
  }
  if (severity === 'medium') {
    return { badge: 'neutral', border: 'border-l-neutral-400', soft: 'bg-neutral-50' }
  }
  return { badge: 'positive', border: 'border-l-success', soft: 'bg-success-bg/30' }
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
  const [severityFilter, setSeverityFilter] = useState<AlertSeverityFilter>('all')
  const [alertViewMode, setAlertViewMode] = useState<'grid' | 'table'>('grid')
  const { data, loading } = useSmartAlertsData()

  const activeAlerts = useMemo(
    () => (data?.alerts ?? []).filter((alert) => isAlertEnabled(alert, preferences)),
    [data?.alerts, preferences],
  )
  const filteredAlerts = useMemo(
    () => (
      severityFilter === 'all'
        ? activeAlerts
        : activeAlerts.filter((alert) => alert.severity === severityFilter)
    ),
    [activeAlerts, severityFilter],
  )
  const severityCounts = useMemo(
    () => ({
      all: activeAlerts.length,
      high: activeAlerts.filter((alert) => alert.severity === 'high').length,
      medium: activeAlerts.filter((alert) => alert.severity === 'medium').length,
      low: activeAlerts.filter((alert) => alert.severity === 'low').length,
    }),
    [activeAlerts],
  )

  const generatedAtLabel = useMemo(() => {
    if (!data?.generated_at) return '-'
    const parsed = new Date(data.generated_at)
    if (Number.isNaN(parsed.getTime())) return '-'
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed)
  }, [data?.generated_at])

  const detectedAlertsCount = data?.alerts.length ?? 0
  const preferenceFiltersHideAlerts = detectedAlertsCount > 0 && activeAlerts.length === 0
  const severityFilterHideAlerts = activeAlerts.length > 0 && filteredAlerts.length === 0
  const dueSoonSubscriptionsCount = useMemo(
    () => (data?.subscriptions ?? []).filter((subscription) => {
      const days = getDaysToDate(subscription.next_due_date)
      return days !== null && days >= 0 && days <= 7
    }).length,
    [data?.subscriptions],
  )

  const togglePreference = (key: keyof AlertPreferences) => {
    const next = { ...preferences, [key]: !preferences[key] }
    setPreferences(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ALERT_PREFERENCES_KEY, JSON.stringify(next))
    }
    trackUxEvent('smart_alerts_toggle_changed', {
      key,
      enabled: next[key],
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
      <div className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-gradient-to-b from-white to-neutral-50/80 shadow-sm ring-1 ring-neutral-100/70">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-light opacity-30 blur-2xl" aria-hidden="true" />
        <div className="absolute -left-10 -bottom-10 h-24 w-24 rounded-full bg-warning-bg opacity-20 blur-2xl" aria-hidden="true" />
        <div className="relative bg-brand-light/30 px-4 py-5 md:px-6 md:py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="app-title text-xl md:text-2xl">{t('planning.alerts.title')}</h1>
              <p className="app-subtitle text-sm mt-0.5">{t('planning.alerts.subtitle')}</p>
            </div>
            <Badge variant={severityCounts.high > 0 ? 'warning' : 'positive'}>
              {severityCounts.high > 0 ? `${severityCounts.high} ${t('planning.alerts.filter_high')}` : t('planning.alerts.empty_alerts')}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            {t('planning.alerts.updated_at', { value: generatedAtLabel })}
          </p>
        </div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-neutral-100 bg-white/90 px-4 py-3 md:px-6">
          <div className="rounded-xl border border-neutral-100 bg-gradient-to-b from-white to-neutral-50/60 px-3 py-2 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-neutral-400">{t('planning.alerts.filter_all')}</p>
            <p className="text-lg font-medium text-neutral-900">{severityCounts.all}</p>
          </div>
          <div className="rounded-xl border border-warning bg-gradient-to-b from-warning-bg/70 to-warning-bg/40 px-3 py-2 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-warning-text">{t('planning.alerts.filter_high')}</p>
            <p className="text-lg font-medium text-warning-text">{severityCounts.high}</p>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-gradient-to-b from-white to-neutral-50 px-3 py-2 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-neutral-700">{t('planning.alerts.filter_medium')}</p>
            <p className="text-lg font-medium text-neutral-900">{severityCounts.medium}</p>
          </div>
          <div className="rounded-xl border border-success bg-gradient-to-b from-success-bg/70 to-success-bg/40 px-3 py-2 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-success-text">{t('planning.alerts.filter_low')}</p>
            <p className="text-lg font-medium text-success-text">{severityCounts.low}</p>
          </div>
        </div>
      </div>

      <section className="app-card rounded-2xl p-4 md:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <article className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-gradient-to-b from-white to-neutral-50/80 p-4 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1.5 bg-neutral-100" />
            <p className="app-label uppercase tracking-wide">{t('planning.alerts.alerts_title')}</p>
            <p className="mt-1 text-2xl font-medium text-neutral-900">{filteredAlerts.length}</p>
            <p className="mt-1 text-xs text-neutral-400">{detectedAlertsCount} {t('planning.alerts.filter_all').toLowerCase()}</p>
          </article>
          <article className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-gradient-to-b from-white to-neutral-50/80 p-4 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
            <div className="absolute left-0 right-0 top-0 h-1.5 bg-warning-bg" />
            <p className="app-label uppercase tracking-wide">{t('planning.alerts.subscriptions_title')}</p>
            <p className="mt-1 text-2xl font-medium text-neutral-900">{data?.subscriptions.length ?? 0}</p>
            <p className="mt-1 text-xs text-neutral-400">{dueSoonSubscriptionsCount} próximos 7 días</p>
          </article>
          <article className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-gradient-to-b from-brand-light/35 to-white p-4 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md ring-1 ring-brand/20">
            <div className="absolute left-0 right-0 top-0 h-1.5 bg-brand" />
            <p className="app-label uppercase tracking-wide">{t('planning.alerts.annual_total')}</p>
            <p className="mt-1 text-xl font-medium text-neutral-900">
              {formatCurrency(Number(data?.subscriptions_annual_total ?? 0), 'COP')}
            </p>
          </article>
        </div>
      </section>

      <section className="app-card rounded-2xl p-4 md:p-5 space-y-3">
        <h2 className="app-section-title">{t('planning.alerts.switches_title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { key: 'budget', label: t('planning.alerts.switch_budget') },
            { key: 'reminders', label: t('planning.alerts.switch_reminders') },
            { key: 'atypical', label: t('planning.alerts.switch_atypical') },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => togglePreference(item.key as keyof AlertPreferences)}
              className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left shadow-sm transition-[transform,box-shadow,border-color,background-color] hover:-translate-y-0.5 hover:shadow-md ${preferences[item.key as keyof AlertPreferences] ? 'border-neutral-100 bg-gradient-to-b from-brand-light/30 to-white ring-1 ring-brand/20' : 'border-neutral-100 bg-gradient-to-b from-white to-neutral-50/70 hover:border-neutral-400'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-700">{item.label}</span>
                <Badge variant={preferences[item.key as keyof AlertPreferences] ? 'positive' : 'neutral'}>
                  {preferences[item.key as keyof AlertPreferences] ? t('planning.alerts.enabled') : t('planning.alerts.disabled')}
                </Badge>
              </div>
              <span
                className={`inline-flex h-5 w-9 rounded-full p-0.5 transition-colors ${preferences[item.key as keyof AlertPreferences] ? 'bg-brand' : 'bg-neutral-100'}`}
                aria-hidden="true"
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${preferences[item.key as keyof AlertPreferences] ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="app-card rounded-2xl p-4 md:p-5 space-y-3">
        <h2 className="app-section-title">{t('planning.alerts.guide_title')}</h2>
        <p className="text-sm text-neutral-700">{t('planning.alerts.guide_subtitle')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <article className="rounded-2xl border border-warning bg-gradient-to-b from-warning-bg/60 to-warning-bg/30 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-warning-text">{t('planning.alerts.guide_high_title')}</p>
            <p className="mt-1 text-sm text-warning-text">{t('planning.alerts.guide_high_body')}</p>
          </article>
          <article className="rounded-2xl border border-neutral-100 bg-gradient-to-b from-white to-neutral-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-neutral-700">{t('planning.alerts.guide_medium_title')}</p>
            <p className="mt-1 text-sm text-neutral-700">{t('planning.alerts.guide_medium_body')}</p>
          </article>
          <article className="rounded-2xl border border-success bg-gradient-to-b from-success-bg/70 to-success-bg/40 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-success-text">{t('planning.alerts.guide_low_title')}</p>
            <p className="mt-1 text-sm text-success-text">{t('planning.alerts.guide_low_body')}</p>
          </article>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="app-section-title">{t('planning.alerts.alerts_title')}</h2>
          <p className="text-xs text-neutral-400">
            {filteredAlerts.length} / {activeAlerts.length}
          </p>
        </div>

        {severityCounts.high > 0 && (
          <InlineAlert
            variant="warning"
            message={`${severityCounts.high} ${t('planning.alerts.filter_high')} · ${t('planning.alerts.quick_filter_example_high')}`}
          />
        )}

        <div className="app-card rounded-2xl bg-gradient-to-b from-white to-neutral-50/60 p-2 md:p-3 ring-1 ring-neutral-100/70">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="tablist" aria-label={t('planning.alerts.quick_filters_title')}>
            {[
              { key: 'all', label: t('planning.alerts.filter_all'), example: t('planning.alerts.quick_filter_example_all') },
              { key: 'high', label: t('planning.alerts.filter_high'), example: t('planning.alerts.quick_filter_example_high') },
              { key: 'medium', label: t('planning.alerts.filter_medium'), example: t('planning.alerts.quick_filter_example_medium') },
              { key: 'low', label: t('planning.alerts.filter_low'), example: t('planning.alerts.quick_filter_example_low') },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={severityFilter === item.key}
                onClick={() => setSeverityFilter(item.key as AlertSeverityFilter)}
                className={`rounded-xl px-3 py-2 text-left shadow-sm transition-all ${
                  severityFilter === item.key
                    ? 'bg-brand text-white shadow-md ring-2 ring-brand-light'
                    : 'border border-neutral-100 bg-gradient-to-b from-white to-neutral-50/70 text-neutral-700 hover:-translate-y-0.5 hover:border-brand hover:text-brand hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${severityFilter === item.key ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                    {severityCounts[item.key as AlertSeverityFilter]}
                  </span>
                </div>
                <p className={`mt-1 text-[11px] ${severityFilter === item.key ? 'text-white/90' : 'text-neutral-500'}`}>
                  {item.example}
                </p>
              </button>
            ))}
          </div>
        </div>

        {filteredAlerts.length === 0 && (
          <div className="space-y-2">
            <InlineAlert
              message={
                preferenceFiltersHideAlerts
                  ? t('planning.alerts.hidden_by_filters')
                  : severityFilterHideAlerts
                    ? t('planning.alerts.hidden_by_severity_filter')
                    : t('planning.alerts.empty_alerts')
              }
              variant="info"
            />
            {preferenceFiltersHideAlerts && (
              <button
                type="button"
                onClick={enableAllAlertTypes}
                className="app-btn-secondary"
              >
                {t('planning.alerts.enable_all')}
              </button>
            )}
          </div>
        )}

        {filteredAlerts.length > 0 && (
          <div className="flex items-center justify-end -mx-2 mb-2">
            <ViewToggle
              modes={[
                { value: 'grid', label: t('common.grid') },
                { value: 'table', label: t('common.table') },
              ]}
              current={alertViewMode}
              onChange={setAlertViewMode}
            />
          </div>
        )}

        {alertViewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {filteredAlerts.map((alert, index) => {
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
                  <Badge variant={severityUi.badge}>
                    {getLocalizedSeverityLabel(alert.severity, t)}
                  </Badge>
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
          <div className="app-card rounded-2xl bg-gradient-to-b from-white to-neutral-50/70 p-3 ring-1 ring-neutral-100/70">
            <div className="app-table-wrap overflow-x-auto">
              <table className="app-table text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-center font-medium align-middle whitespace-nowrap">{t('planning.alerts.severity_label')}</th>
                    <th className="px-3 py-2 text-center font-medium align-middle">{t('common.title')}</th>
                    <th className="px-3 py-2 text-center font-medium align-middle max-w-xs">{t('common.detail')}</th>
                    <th className="px-3 py-2 text-center font-medium align-middle">{t('common.amount')}</th>
                    <th className="px-3 py-2 text-center font-medium align-middle whitespace-nowrap">{t('common.due_date')}</th>
                    <th className="px-3 py-2 text-center font-medium align-middle">{t('common.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert, index) => {
                    const action = resolveAlertAction(alert)
                    const severityUi = getSeverityClasses(alert.severity)
                    return (
                      <tr key={`${alert.code}-${alert.transaction_id ?? index}`}>
                        <td className="px-3 py-2">
                          <Badge variant={severityUi.badge}>
                            {getLocalizedSeverityLabel(alert.severity, t)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-neutral-900 font-medium">{getLocalizedAlertText(alert, t).title}</td>
                        <td className="px-3 py-2 text-neutral-700 text-sm max-w-xs truncate" title={getLocalizedAlertText(alert, t).detail}>{getLocalizedAlertText(alert, t).detail}</td>
                        <td className="px-3 py-2 text-neutral-900 font-medium">{alert.amount ? formatCurrency(Number(alert.amount), 'COP') : '-'}</td>
                        <td className="px-3 py-2 text-neutral-700">
                          {alert.due_date ? (
                            <Badge variant={alert.severity === 'high' ? 'warning' : 'neutral'}>
                              {formatIsoDate(alert.due_date)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-neutral-500">{t('planning.alerts.no_due_date')}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {action && (
                            <button
                              type="button"
                              onClick={() => {
                                trackUxEvent('smart_alert_action_clicked', { code: alert.code, to: action.to })
                                navigate(action.to)
                              }}
                              className="rounded-md border border-neutral-100 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition-all hover:border-brand hover:text-brand hover:shadow-sm"
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
          </div>
        )}      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="app-section-title">{t('planning.alerts.subscriptions_title')}</h2>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{data?.subscriptions.length ?? 0}</Badge>
            <Badge variant={dueSoonSubscriptionsCount > 0 ? 'warning' : 'positive'}>{dueSoonSubscriptionsCount} próximos</Badge>
            <p className="text-sm text-neutral-700">
              {t('planning.alerts.annual_total')}: <span className="font-medium text-neutral-900">{formatCurrency(Number(data?.subscriptions_annual_total ?? 0), 'COP')}</span>
            </p>
          </div>
        </div>

        {!data?.subscriptions.length && (
          <InlineAlert message={t('planning.alerts.empty_subscriptions')} variant="info" />
        )}

        {!!data?.subscriptions.length && (
          <div className="app-card rounded-2xl bg-gradient-to-b from-white to-neutral-50/70 p-3 ring-1 ring-neutral-100/70">
            <div className="space-y-3 md:hidden">
              {data.subscriptions.map((subscription) => (
                <article key={subscription.key} className="rounded-2xl border border-neutral-100 bg-gradient-to-b from-white to-neutral-50/70 p-4 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-neutral-900">{subscription.name}</p>
                    <Badge variant={(getDaysToDate(subscription.next_due_date) ?? 999) <= 7 ? 'warning' : 'neutral'}>{formatIsoDate(subscription.next_due_date)}</Badge>
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
                      <span>Confianza</span>
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

            <div className="hidden md:block app-table-wrap">
              <table className="app-table text-sm">
                <thead>
                <tr>
                  <th className="px-3 py-2 text-center font-medium align-middle">{t('planning.alerts.sub_name')}</th>
                  <th className="px-3 py-2 text-center font-medium align-middle">{t('planning.alerts.sub_monthly')}</th>
                  <th className="px-3 py-2 text-center font-medium align-middle">{t('planning.alerts.sub_annual')}</th>
                  <th className="px-3 py-2 text-center font-medium align-middle">{t('planning.alerts.sub_next_due')}</th>
                  <th className="px-3 py-2 text-center font-medium align-middle">{t('planning.alerts.sub_actions')}</th>
                </tr>
                </thead>
                <tbody>
                  {data.subscriptions.map((subscription) => (
                    <tr key={subscription.key}>
                      <td className="px-3 py-2 text-neutral-900">{subscription.name}</td>
                      <td className="px-3 py-2 text-neutral-700">{formatCurrency(Number(subscription.monthly_estimate), 'COP')}</td>
                      <td className="px-3 py-2 text-neutral-700">{formatCurrency(Number(subscription.annual_cost), 'COP')}</td>
                      <td className="px-3 py-2 text-neutral-700">
                        <Badge variant={(getDaysToDate(subscription.next_due_date) ?? 999) <= 7 ? 'warning' : 'neutral'}>
                          {formatIsoDate(subscription.next_due_date)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-neutral-700">
                        <button
                          type="button"
                          onClick={() => {
                            trackUxEvent('smart_subscription_action_clicked', {
                              name: subscription.name,
                              to: '/transactions',
                            })
                            navigate(`/transactions?q=${encodeURIComponent(subscription.name)}`)
                          }}
                          className="rounded-md border border-neutral-100 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-all hover:-translate-y-0.5 hover:border-brand hover:text-brand hover:shadow-sm"
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
            return (
              <article key={kpi.key} className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-gradient-to-b from-white to-neutral-50/70 p-4 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
                <div className="absolute left-0 right-0 top-0 h-1.5 bg-brand-light" />
                <p className="text-xs uppercase tracking-wide text-neutral-400">{localized.title}</p>
                <p className="mt-1 text-xl font-medium text-neutral-900">{kpi.value} {localized.unit}</p>
                <p className="mt-1 text-xs text-neutral-400">{localized.description}</p>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
