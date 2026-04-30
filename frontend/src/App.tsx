// App.tsx — punto de entrada de rutas de la SPA.
// Define la jerarquía de routing y los providers globales (toasts).
// El árbol está organizado en tres capas para separar responsabilidades:
//   1) Rutas públicas (login/register) sin sesión.
//   2) ProtectedRoute: gate de autenticación (redirige a /login si no hay user).
//   3) AppLayout: chrome compartido (sidebar, topbar) para todas las páginas privadas.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import TransactionsPage from '@/pages/transactions/TransactionsPage'
import AccountsPage from '@/pages/accounts/AccountsPage'
import PocketsPage from '@/pages/pockets/PocketsPage'
import InvestmentsPage from '@/pages/investments/InvestmentsPage'
import ProfilePage from '@/pages/profile/ProfilePage'
import AdminPage from '@/pages/admin/AdminPage'
import ManagementPage from '@/pages/management/ManagementPage'
import { ToastProvider } from '@/hooks/useToast'
import ToastContainer from '@/components/ui/ToastContainer'
import PageErrorBoundary from '@/components/ui/PageErrorBoundary'
import { QUERY_KEYS } from '@/hooks/useCatalogQueries'

export default function App() {
  // ToastProvider envuelve todo el árbol porque cualquier página/componente
  // (incluso fuera del layout) puede emitir notificaciones (e.g. login fallido).
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
        <Routes>
          {/* Rutas públicas: accesibles sin sesión */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rutas privadas: ProtectedRoute valida sesión antes de renderizar */}
          <Route element={<ProtectedRoute />}>
            {/* AppLayout aporta sidebar + topbar; envolver aquí evita repetirlo en cada página */}
            <Route element={<AppLayout />}>
              <Route
                path="/dashboard"
                element={
                  <PageErrorBoundary labelKey="errors.page_label_dashboard" invalidateKeys={[QUERY_KEYS.accounts]}>
                    <DashboardPage />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="/transactions"
                element={
                  <PageErrorBoundary labelKey="errors.page_label_transactions" invalidateKeys={[QUERY_KEYS.accounts, QUERY_KEYS.categories]}>
                    <TransactionsPage />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="/accounts"
                element={
                  <PageErrorBoundary labelKey="errors.page_label_accounts" invalidateKeys={[QUERY_KEYS.accounts, QUERY_KEYS.banks]}>
                    <AccountsPage />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="/pockets"
                element={
                  <PageErrorBoundary labelKey="errors.page_label_pockets" invalidateKeys={[QUERY_KEYS.pockets, QUERY_KEYS.accounts]}>
                    <PocketsPage />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="/investments"
                element={
                  <PageErrorBoundary labelKey="errors.page_label_investments" invalidateKeys={[QUERY_KEYS.investments, QUERY_KEYS.investmentEntities]}>
                    <InvestmentsPage />
                  </PageErrorBoundary>
                }
              />
              {/* /categories quedó fusionada en /admin como tab; se redirige por compat. con bookmarks. */}
              <Route path="/categories" element={<Navigate to="/admin?tab=categories" replace />} />
              <Route
                path="/admin"
                element={
                  <PageErrorBoundary labelKey="errors.page_label_admin" invalidateKeys={[QUERY_KEYS.banks, QUERY_KEYS.countries, QUERY_KEYS.categories, QUERY_KEYS.investmentEntities]}>
                    <AdminPage />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="/management"
                element={
                  <PageErrorBoundary labelKey="errors.page_label_management">
                    <ManagementPage />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="/profile"
                element={
                  <PageErrorBoundary labelKey="errors.page_label_profile">
                    <ProfilePage />
                  </PageErrorBoundary>
                }
              />
            </Route>
          </Route>

          {/* Catch-all: cualquier ruta desconocida cae al dashboard (autenticado) o a /login (no autenticado, vía ProtectedRoute). */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      {/* ToastContainer va FUERA del Router para que los toasts persistan al navegar. */}
      <ToastContainer />
    </ToastProvider>
    </ErrorBoundary>
  )
}
