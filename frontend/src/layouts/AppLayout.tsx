import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { to: '/dashboard', label: 'Inicio' },
  { to: '/transactions', label: 'Movimientos' },
  { to: '/accounts', label: 'Cuentas' },
  { to: '/pockets', label: 'Bolsillos' },
]

export default function AppLayout() {
  const { logout, user } = useAuthStore()

  return (
    <div className="app-shell flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 app-panel rounded-none border-l-0 border-t-0 border-b-0 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-[var(--af-border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--af-accent)] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V17a1 1 0 11-2 0v-.07A7.003 7.003 0 015 10h1a6 6 0 0012 0h1a7.003 7.003 0 01-6 6.93z" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-[var(--af-text)]">Atlas Finance</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-tone-neutral text-[var(--af-accent)] border border-[var(--af-border)]'
                    : 'text-[var(--af-text-muted)] hover:bg-[var(--af-surface-alt)] hover:text-[var(--af-text)]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer: user + logout */}
        <div className="px-3 py-4 border-t border-[var(--af-border)] space-y-2">
          {user && (
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-[var(--af-text)] truncate">{user.full_name}</p>
              <p className="text-xs text-[var(--af-text-muted)] truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium tone-negative hover:bg-tone-negative transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="app-page flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
