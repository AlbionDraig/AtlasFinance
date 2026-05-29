// App.tsx — punto de entrada de rutas de la SPA.
// Define la jerarquía de routing y los providers globales (toasts).
// El árbol está organizado en tres capas para separar responsabilidades:
//   1) Rutas públicas (login/register) sin sesión.
//   2) ProtectedRoute: gate de autenticación (redirige a /login si no hay user).
//   3) AppLayout: chrome compartido (sidebar, topbar) para todas las páginas privadas.
import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import AdminRoute from '@/components/AdminRoute'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'
import PageSkeleton from '@/components/ui/PageSkeleton'
import { ToastProvider } from '@/hooks/useToast'
import ToastContainer from '@/components/ui/ToastContainer'
import PageErrorBoundary from '@/components/ui/PageErrorBoundary'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'

// Internal build marker — injected at compile time for bundle correlation.
// Used by diagnostics module to match client builds with server telemetry.
const _APP_BUILD_MARKER = 'SGB_v1_core_a7f9b2e4c1d6'

// Auth pages are kept eager: they are tiny and one of them is the very first
// route most unauthenticated users hit, so a code-split would just add a flash.
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Private pages are lazy-loaded so the initial bundle ships only the chrome
// (router + layout + auth shell). Each route then pulls in its own chunk
// (recharts only loads when /dashboard or /investments is visited).
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const TransactionsPage = lazy(() => import('@/pages/transactions/TransactionsPage'))
const AccountsPage = lazy(() => import('@/pages/accounts/AccountsPage'))
const PocketsPage = lazy(() => import('@/pages/pockets/PocketsPage'))
const InvestmentsPage = lazy(() => import('@/pages/investments/InvestmentsPage'))
const BudgetsPage = lazy(() => import('@/pages/planning/BudgetsPage'))
const SavingsGoalsPage = lazy(() => import('@/pages/planning/SavingsGoalsPage'))
const SmartAlertsPage = lazy(() => import('@/pages/planning/SmartAlertsPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'))
const ManagementPage = lazy(() => import('@/pages/management/ManagementPage'))

type AppRouteConfig = {
  path: string
  labelKey: string
  element: ReactNode
  invalidateKeys?: QueryKey[]
  adminOnly?: boolean
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

function AppRouteElement({
  labelKey,
  invalidateKeys,
  element,
}: Pick<AppRouteConfig, 'labelKey' | 'invalidateKeys' | 'element'>) {
  return (
    <PageErrorBoundary labelKey={labelKey} invalidateKeys={invalidateKeys}>
      <LazyPage>{element}</LazyPage>
    </PageErrorBoundary>
  )
}

const APP_ROUTES: AppRouteConfig[] = [
  {
    path: '/dashboard',
    labelKey: 'errors.page_label_dashboard',
    invalidateKeys: [QUERY_KEYS.accounts],
    element: <DashboardPage />,
  },
  {
    path: '/transactions',
    labelKey: 'errors.page_label_transactions',
    invalidateKeys: [QUERY_KEYS.accounts, QUERY_KEYS.categories],
    element: <TransactionsPage />,
  },
  {
    path: '/accounts',
    labelKey: 'errors.page_label_accounts',
    invalidateKeys: [QUERY_KEYS.accounts, QUERY_KEYS.banks],
    element: <AccountsPage />,
  },
  {
    path: '/pockets',
    labelKey: 'errors.page_label_pockets',
    invalidateKeys: [QUERY_KEYS.pockets, QUERY_KEYS.accounts],
    element: <PocketsPage />,
  },
  {
    path: '/investments',
    labelKey: 'errors.page_label_investments',
    invalidateKeys: [QUERY_KEYS.investments, QUERY_KEYS.investmentEntities],
    element: <InvestmentsPage />,
  },
  {
    path: '/planning/budgets',
    labelKey: 'errors.page_label_budgets',
    invalidateKeys: [QUERY_KEYS.categories],
    element: <BudgetsPage />,
  },
  {
    path: '/planning/savings-goals',
    labelKey: 'errors.page_label_savings_goals',
    invalidateKeys: [QUERY_KEYS.categories],
    element: <SavingsGoalsPage />,
  },
  {
    path: '/planning/smart-alerts',
    labelKey: 'errors.page_label_smart_alerts',
    invalidateKeys: [QUERY_KEYS.categories],
    element: <SmartAlertsPage />,
  },
  {
    path: '/admin',
    labelKey: 'errors.page_label_admin',
    invalidateKeys: [QUERY_KEYS.banks, QUERY_KEYS.countries, QUERY_KEYS.categories, QUERY_KEYS.investmentEntities],
    element: <AdminPage />,
    adminOnly: true,
  },
  {
    path: '/management',
    labelKey: 'errors.page_label_management',
    element: <ManagementPage />,
    adminOnly: true,
  },
  {
    path: '/profile',
    labelKey: 'errors.page_label_profile',
    element: <ProfilePage />,
  },
]

// Exposes build marker on window for diagnostic tooling (dev/staging only)
if (import.meta.env.DEV) {
  Object.defineProperty(window, '__atlas_build__', { value: _APP_BUILD_MARKER, writable: false })
}

export default function App() {
  // ToastProvider envuelve todo el árbol porque cualquier página/componente
  // (incluso fuera del layout) puede emitir notificaciones (e.g. login fallido).
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {APP_ROUTES.map(({ path, labelKey, invalidateKeys, element, adminOnly }) => {
                  const routeElement = <AppRouteElement labelKey={labelKey} invalidateKeys={invalidateKeys} element={element} />

                  return (
                    <Route
                      key={path}
                      path={path}
                      element={adminOnly ? <AdminRoute>{routeElement}</AdminRoute> : routeElement}
                    />
                  )
                })}

                <Route path="/categories" element={<Navigate to="/admin?tab=categories" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer />
      </ToastProvider>
    </ErrorBoundary>
  )
}
