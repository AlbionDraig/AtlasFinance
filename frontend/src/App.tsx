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
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/pockets" element={<PocketsPage />} />
              <Route path="/investments" element={<InvestmentsPage />} />
              {/* /categories quedó fusionada en /admin como tab; se redirige por compat. con bookmarks. */}
              <Route path="/categories" element={<Navigate to="/admin?tab=categories" replace />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/management" element={<ManagementPage />} />
              <Route path="/profile" element={<ProfilePage />} />
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
