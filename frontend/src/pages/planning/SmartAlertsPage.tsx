import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
import InlineAlert from '@/components/ui/InlineAlert'
import PageSkeleton from '@/components/ui/PageSkeleton'
import Tooltip from '@/components/ui/Tooltip'
import { useSmartAlertsData } from '@/hooks/useSmartAlertsData'
import { trackUxEvent } from '@/lib/uxTelemetry'
import { formatCurrency } from '@/lib/utils'
import type { SmartAlertItem } from '@/types'

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

export default function SmartAlertsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [preferences, setPreferences] = useState<AlertPreferences>(loadPreferences)
  const [severityFilter, setSeverityFilter] = useState<AlertSeverityFilter>('all')
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
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] p-4 md:p-6 pb-20">
      <div>
        <h1 className="app-title text-xl">{t('planning.alerts.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">{t('planning.alerts.subtitle')}</p>
        <p className="mt-1 text-xs text-neutral-400">
          {t('planning.alerts.updated_at', { value: generatedAtLabel })}
        </p>
      </div>

      <section className="app-card p-4 md:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <article className="rounded-lg border border-neutral-100 p-3">
            <p className="app-label uppercase tracking-wide">{t('planning.alerts.alerts_title')}</p>
            <p className="mt-1 text-2xl font-medium text-neutral-900">{filteredAlerts.length}</p>
          </article>
          <article className="rounded-lg border border-neutral-100 p-3">
            <p className="app-label uppercase tracking-wide">{t('planning.alerts.subscriptions_title')}</p>
            <p className="mt-1 text-2xl font-medium text-neutral-900">{data?.subscriptions.length ?? 0}</p>
          </article>
          <article className="rounded-lg border border-neutral-100 p-3">
            <p className="app-label uppercase tracking-wide">{t('planning.alerts.annual_total')}</p>
            <p className="mt-1 text-xl font-medium text-neutral-900">
              {formatCurrency(Number(data?.subscriptions_annual_total ?? 0), 'COP')}
            </p>
          </article>
        </div>
      </section>

      <section className="app-card p-4 md:p-5 space-y-3">
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
              className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white px-3 py-2 text-left transition-colors hover:bg-neutral-50"
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

      <section className="app-card p-4 md:p-5 space-y-3">
        <h2 className="app-section-title">{t('planning.alerts.guide_title')}</h2>
        <p className="text-sm text-neutral-700">{t('planning.alerts.guide_subtitle')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <article className="rounded-lg border border-warning bg-warning-bg/40 p-3">
            <p className="text-xs uppercase tracking-wide text-warning-text">{t('planning.alerts.guide_high_title')}</p>
            <p className="mt-1 text-sm text-warning-text">{t('planning.alerts.guide_high_body')}</p>
          </article>
          <article className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-700">{t('planning.alerts.guide_medium_title')}</p>
            <p className="mt-1 text-sm text-neutral-700">{t('planning.alerts.guide_medium_body')}</p>
          </article>
          <article className="rounded-lg border border-success bg-success-bg/60 p-3">
            <p className="text-xs uppercase tracking-wide text-success-text">{t('planning.alerts.guide_low_title')}</p>
            <p className="mt-1 text-sm text-success-text">{t('planning.alerts.guide_low_body')}</p>
          </article>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="app-section-title">{t('planning.alerts.alerts_title')}</h2>
          <Badge variant="neutral">{t('planning.alerts.alerts_count', { count: filteredAlerts.length })}</Badge>
        </div>

        <div className="app-card p-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="tablist" aria-label={t('planning.alerts.quick_filters_title')}>
            {[
              { key: 'all', label: t('planning.alerts.filter_all'), help: t('planning.alerts.quick_filter_help_all') },
              { key: 'high', label: t('planning.alerts.filter_high'), help: t('planning.alerts.quick_filter_help_high') },
              { key: 'medium', label: t('planning.alerts.filter_medium'), help: t('planning.alerts.quick_filter_help_medium') },
              { key: 'low', label: t('planning.alerts.filter_low'), help: t('planning.alerts.quick_filter_help_low') },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={severityFilter === item.key}
                  onClick={() => setSeverityFilter(item.key as AlertSeverityFilter)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    severityFilter === item.key
                      ? 'bg-brand text-white shadow-sm'
                      : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'
                  }`}
                >
                  {item.label}
                </button>
                <Tooltip content={item.help} ariaLabel={item.help} widthClassName="w-56">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-100 text-[10px] text-neutral-400">i</span>
                </Tooltip>
              </div>
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

        {filteredAlerts.map((alert, index) => {
          const action = resolveAlertAction(alert)

          return (
            <article
              key={`${alert.code}-${alert.transaction_id ?? index}`}
              className={`app-card border-l-4 p-4 ${alert.severity === 'high' ? 'border-l-warning' : alert.severity === 'medium' ? 'border-l-neutral-400' : 'border-l-success'}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={alert.severity === 'high' ? 'warning' : alert.severity === 'medium' ? 'neutral' : 'positive'}>
                  {getLocalizedSeverityLabel(alert.severity, t)}
                </Badge>
                <p className="text-sm font-medium text-neutral-900">{getLocalizedAlertText(alert, t).title}</p>
              </div>
              <p className="mt-2 text-sm text-neutral-700">{getLocalizedAlertText(alert, t).detail}</p>
              {(alert.amount || alert.due_date) && (
                <p className="mt-2 text-xs text-neutral-400">
                  {alert.amount ? formatCurrency(Number(alert.amount), 'COP') : ''}
                  {alert.amount && alert.due_date ? ' • ' : ''}
                  {alert.due_date ? t('planning.alerts.due_date', { date: alert.due_date }) : ''}
                </p>
              )}

              {action && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      trackUxEvent('smart_alert_action_clicked', { code: alert.code, to: action.to })
                      navigate(action.to)
                    }}
                    className="rounded-md border border-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-brand hover:text-brand"
                  >
                    {action.label}
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="app-section-title">{t('planning.alerts.subscriptions_title')}</h2>
          <p className="text-sm text-neutral-700">
            {t('planning.alerts.annual_total')}: <span className="font-medium text-neutral-900">{formatCurrency(Number(data?.subscriptions_annual_total ?? 0), 'COP')}</span>
          </p>
        </div>

        {!data?.subscriptions.length && (
          <InlineAlert message={t('planning.alerts.empty_subscriptions')} variant="info" />
        )}

        {!!data?.subscriptions.length && (
          <div className="app-card p-3">
            <div className="space-y-3 md:hidden">
              {data.subscriptions.map((subscription) => (
                <article key={subscription.key} className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-neutral-900">{subscription.name}</p>
                    <Badge variant="neutral">{subscription.next_due_date ?? '-'}</Badge>
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
                      className="rounded-md border border-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-brand hover:text-brand"
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
                  <th className="px-3 py-2 text-left font-medium">{t('planning.alerts.sub_name')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('planning.alerts.sub_monthly')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('planning.alerts.sub_annual')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('planning.alerts.sub_next_due')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('planning.alerts.sub_actions')}</th>
                </tr>
                </thead>
                <tbody>
                  {data.subscriptions.map((subscription) => (
                    <tr key={subscription.key}>
                      <td className="px-3 py-2 text-neutral-900">{subscription.name}</td>
                      <td className="px-3 py-2 text-neutral-700">{formatCurrency(Number(subscription.monthly_estimate), 'COP')}</td>
                      <td className="px-3 py-2 text-neutral-700">{formatCurrency(Number(subscription.annual_cost), 'COP')}</td>
                      <td className="px-3 py-2 text-neutral-700">{subscription.next_due_date ?? '-'}</td>
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
                          className="rounded-md border border-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-brand hover:text-brand"
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

      <section className="app-card p-4 md:p-5 space-y-3">
        <h2 className="app-section-title">{t('planning.alerts.kpis_title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(data?.kpis ?? []).map((kpi) => (
            <article key={kpi.key} className="rounded-lg border border-neutral-100 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-400">{kpi.title}</p>
              <p className="mt-1 text-xl font-medium text-neutral-900">{kpi.value} {kpi.unit}</p>
              <p className="mt-1 text-xs text-neutral-400">{kpi.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
