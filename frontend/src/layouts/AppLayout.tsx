import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  {
    to: '/dashboard',
    label: 'Resumen financiero',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5L12 4l9 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10.5V20h14v-9.5" />
      </svg>
    ),
  },
  {
    to: '/transactions',
    label: 'Movimientos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 10l2 2-2 2" />
      </svg>
    ),
  },
  {
    to: '/accounts',
    label: 'Cuentas',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
      </svg>
    ),
  },
  {
    to: '/pockets',
    label: 'Bolsillos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a1 1 0 011-1h4a1 1 0 011 1v2" />
      </svg>
    ),
  },
  {
    to: '/admin',
    label: 'Administración',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9M10.5 12h9M10.5 18h9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    ),
  },
  {
    to: '/management',
    label: 'Gestión',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l3 3-3 3" />
      </svg>
    ),
  },
]

export default function AppLayout() {
  const { logout, user } = useAuthStore()
  const [expanded, setExpanded] = useState(false)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const OPEN_DELAY_MS = 140
  const CLOSE_DELAY_MS = 180

  const clearTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleOpen = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (expanded || openTimerRef.current) return
    openTimerRef.current = setTimeout(() => {
      setExpanded(true)
      openTimerRef.current = null
    }, OPEN_DELAY_MS)
  }

  const scheduleClose = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (!expanded || closeTimerRef.current) return
    closeTimerRef.current = setTimeout(() => {
      setExpanded(false)
      closeTimerRef.current = null
    }, CLOSE_DELAY_MS)
  }

  useEffect(() => clearTimers, [])

  const collapsed = !expanded

  return (
    <div className="app-page flex h-screen">
      {/* Sidebar */}
      <aside
        className="relative w-20 shrink-0 overflow-visible"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocusCapture={() => {
          clearTimers()
          setExpanded(true)
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            scheduleClose()
          }
        }}
      >
        <div
          className={`${collapsed ? 'w-20' : 'w-60 shadow-lg'} absolute left-0 top-0 h-full bg-[#1c1b1a] text-[#f7f7f6] border-r border-[#edeceb] flex flex-col z-[120]`}
        >
          {/* Logo */}
          <div className={`${collapsed ? 'px-2 py-3 flex-col items-center gap-2' : 'px-6 py-5 items-center gap-3'} border-b border-white/10 flex`}>
            <div className="w-8 h-8 rounded-lg bg-[#ca0b0b] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V17a1 1 0 11-2 0v-.07A7.003 7.003 0 015 10h1a6 6 0 0012 0h1a7.003 7.003 0 01-6 6.93z" />
              </svg>
            </div>
            {!collapsed && <span className="text-base font-bold tracking-tight text-[#f7f7f6]">Atlas Finance</span>}
          </div>

          {/* Nav */}
          <nav className={`${collapsed ? 'px-2' : 'px-3'} flex-1 py-4 space-y-1`}>
            {navItems.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center ${collapsed ? 'justify-center h-9 w-9 mx-auto px-0' : 'px-3 py-2'} rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#ca0b0b] text-white font-medium'
                      : 'text-[#b0aeab] hover:text-[#f7f7f6] hover:bg-white/10'
                  }`
                }
                title={collapsed ? label : undefined}
              >
                {collapsed
                  ? icon
                  : (
                      <>
                        <span className="mr-2">{icon}</span>
                        <span>{label}</span>
                      </>
                    )}
              </NavLink>
            ))}
          </nav>

          {/* Footer: user + logout */}
          <div className="px-3 py-4 border-t border-white/10 space-y-2">
            {!collapsed && user && (
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#ca0b0b] text-white'
                      : 'text-[#b0aeab] hover:text-[#f7f7f6] hover:bg-white/10'
                  }`
                }
              >
                <div className="w-6 h-6 rounded-full bg-[#fce8e8] flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-medium text-[#8a0808]">
                    {user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">{user.full_name}</p>
                  <p className="text-[10px] text-[#b0aeab] truncate leading-tight">{user.email}</p>
                </div>
              </NavLink>
            )}
            {collapsed && user && (
              <NavLink
                to="/profile"
                title="Mi perfil"
                className={({ isActive }) =>
                  `flex items-center justify-center h-9 w-9 mx-auto rounded-lg transition-colors ${
                    isActive ? 'bg-[#ca0b0b]' : 'text-[#b0aeab] hover:text-[#f7f7f6] hover:bg-white/10'
                  }`
                }
              >
                <span className="text-xs font-medium">
                  {user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
              </NavLink>
            )}
            <button
              onClick={logout}
              className={`w-full flex items-center ${collapsed ? 'justify-center h-9 w-9 mx-auto px-0' : 'px-3 py-2'} rounded-lg text-sm font-medium text-[#b0aeab] hover:text-[#f7f7f6] hover:bg-white/10 transition-colors`}
              title={collapsed ? 'Cerrar sesión' : undefined}
            >
              {collapsed
                ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 16l4-4-4-4" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H9" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19H6a2 2 0 01-2-2V7a2 2 0 012-2h6" />
                    </svg>
                  )
                : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 16l4-4-4-4" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H9" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19H6a2 2 0 01-2-2V7a2 2 0 012-2h6" />
                      </svg>
                      <span>Cerrar sesión</span>
                    </>
                  )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`app-page flex-1 overflow-y-auto overflow-x-hidden p-6 transition-[padding-left] duration-200 ${expanded ? 'pl-44' : 'pl-6'}`}>
        <Outlet />
      </main>
    </div>
  )
}
