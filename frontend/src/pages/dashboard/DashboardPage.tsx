import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import InvestmentsTab from './components/InvestmentsTab'
import SummaryTab from './components/SummaryTab'
import { trackUxEvent } from '@/lib/uxTelemetry'

type Tab = 'resumen' | 'inversiones'

function normalizeTab(value: string | null): Tab {
  if (value === 'resumen' || value === 'inversiones') return value
  return 'resumen'
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useTranslation()

  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>(() => normalizeTab(searchParams.get('tab')))
  const [currency, setCurrency] = useState('COP')

  useEffect(() => {
    const tabFromUrl = normalizeTab(searchParams.get('tab'))
    if (tabFromUrl !== activeTab) setActiveTab(tabFromUrl)
  }, [searchParams])

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    setSearchParams({ tab })
    trackUxEvent('dashboard_tab_changed', { tab })
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] rounded-2xl p-4 md:p-6">

      {/* Header */}
      <div>
        <h1 className="app-title text-xl">{t('dashboard.title')}</h1>
        <p className="app-subtitle text-sm mt-0.5">{t('dashboard.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="app-card p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="tablist" aria-label={t('dashboard.title')}>
          <button
            type="button"
            onClick={() => handleTabChange('resumen')}
            role="tab"
            aria-selected={activeTab === 'resumen'}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'resumen' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            {t('dashboard.tab_summary')}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('inversiones')}
            role="tab"
            aria-selected={activeTab === 'inversiones'}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'inversiones' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            {t('dashboard.tab_investments')}
          </button>
        </div>
      </div>

      {activeTab === 'resumen' && (
        <SummaryTab currency={currency} onCurrencyChange={setCurrency} />
      )}

      {activeTab === 'inversiones' && (
        <InvestmentsTab currency={currency} onCurrencyChange={setCurrency} />
      )}
    </div>
  )
}
