import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SummaryTab from './components/SummaryTab'
import InvestmentsTab from './components/InvestmentsTab'

// ─── Types ────────────────────────────────────────────────────────────────────
type DashboardTab = 'summary' | 'investments'

function normalizeDashboardTab(value: string | null): DashboardTab {
  if (value === 'summary' || value === 'investments') {
    return value
  }

  return 'summary'
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    () => normalizeDashboardTab(searchParams.get('tab')),
  )
  const [currency, setCurrency] = useState('COP')

  useEffect(() => {
    const tabFromUrl = normalizeDashboardTab(searchParams.get('tab'))
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, activeTab])

  function handleTabChange(tab: DashboardTab) {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  return (
    <div className="app-shell w-full mx-auto space-y-7 md:space-y-8 max-w-[1440px] rounded-2xl p-4 md:p-6">
      <div>
        <h1 className="app-title text-xl">Resumen financiero</h1>
        <p className="app-subtitle text-sm mt-0.5">Vista general de tus finanzas en el período elegido</p>
      </div>

      <div className="app-card p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('summary')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'summary' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            Resumen general
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('investments')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'investments' ? 'bg-brand text-white' : 'border border-neutral-100 text-neutral-700 hover:border-brand hover:text-brand'}`}
          >
            Inversiones
          </button>
        </div>
      </div>

      {activeTab === 'summary' && (
        <SummaryTab currency={currency} onCurrencyChange={setCurrency} />
      )}
      {activeTab === 'investments' && (
        <InvestmentsTab currency={currency} onCurrencyChange={setCurrency} />
      )}
    </div>
  )
}
