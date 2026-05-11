// AppLayout â€” chrome compartido por todas las pÃ¡ginas privadas.
// Aporta sidebar (navegaciÃ³n + perfil + logout) y un Ã¡rea principal con <Outlet/>.
// El sidebar usa hover-expansion (icon-only â†’ expandido) para maximizar Ã¡rea
// Ãºtil en desktop sin sacrificar acceso rÃ¡pido al menÃº.
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

// CatÃ¡logo declarativo de items del sidebar. Mantenerlo aquÃ­ (vs. en cada NavLink)
// permite reordenar/agregar entradas sin tocar el JSX del render.
const navItems = [
  {
    to: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5L12 4l9 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10.5V20h14v-9.5" />
      </svg>
    ),
  },
  {
    to: '/transactions',
    labelKey: 'nav.transactions',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 10l2 2-2 2" />
      </svg>
    ),
  },
  {
    to: '/accounts',
    labelKey: 'nav.accounts',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
      </svg>
    ),
  },
  {
    to: '/pockets',
    labelKey: 'nav.pockets',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a1 1 0 011-1h4a1 1 0 011 1v2" />
      </svg>
    ),
  },
  {
    to: '/investments',
    labelKey: 'nav.investments',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-4 4 4 4-6 4-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21H3" />
      </svg>
    ),
  },
  {
    to: '/planning/budgets',
    labelKey: 'nav.planning_budgets',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M3 20h18" />
      </svg>
    ),
  },
  {
    to: '/planning/savings-goals',
    labelKey: 'nav.planning_goals',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    to: '/admin',
    labelKey: 'nav.admin',
    adminOnly: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9M10.5 12h9M10.5 18h9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    ),
  },
  {
    to: '/management',
    labelKey: 'nav.management',
    adminOnly: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l3 3-3 3" />
      </svg>
    ),
  },
]

const SIDEBAR_PIN_KEY = 'atlasfinance.sidebar.pinned'

export default function AppLayout() {
  const { logout, user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [pinned, setPinned] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SIDEBAR_PIN_KEY) === '1'
  })
  const [expanded, setExpanded] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Refs (no state) para los timers porque su mutaciÃ³n no debe disparar re-render
  // y debemos poder cancelarlos sincrÃ³nicamente desde otros handlers.
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hidrata el perfil desde el servidor al montar para reflejar cambios hechos
  // en otras sesiones (e.g. email/nombre actualizados).
  useEffect(() => {
    authApi.me().then((res) => setUser(res.data)).catch(() => {
      // Silencioso: si falla (401) el interceptor de axios maneja la sesiÃ³n.
    })
  }, [])

  // Delays pequeÃ±os para evitar parpadeos cuando el cursor cruza el sidebar
  // accidentalmente (e.g. moverse hacia el menÃº desde el contenido).
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
    if (pinned) return
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
    if (pinned) return
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

  function handleLogout() {
    // Fire-and-forget: revocamos el token en el backend pero no bloqueamos
    // la navegaciÃ³n esperando la respuesta. El usuario sale inmediatamente.
    authApi.logout().catch(() => {})
    logout()
    // replace: true evita que "atrÃ¡s" en el navegador regrese a la app autenticada.
    navigate('/login', { replace: true })
  }

  const handleTogglePin = useCallback(() => {
    clearTimers()
    setPinned((current) => {
      const next = !current
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SIDEBAR_PIN_KEY, next ? '1' : '0')
      }
      if (next) setExpanded(true)
      if (!next) setExpanded(false)
      return next
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'b') return

      const target = event.target as HTMLElement | null
      if (target) {
        const editableTags = ['INPUT', 'TEXTAREA', 'SELECT']
        if (target.isContentEditable || editableTags.includes(target.tagName)) return
      }

      event.preventDefault()
      handleTogglePin()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleTogglePin])

  useEffect(() => {
    if (!mobileMenuOpen || typeof window === 'undefined') return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const mediaQueryWithLegacyApi = mediaQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void
    }
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileMenuOpen(false)
    }

    if (typeof mediaQueryWithLegacyApi.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onDesktop)
      return () => mediaQuery.removeEventListener('change', onDesktop)
    }

    mediaQueryWithLegacyApi.addListener?.(onDesktop)
    return () => mediaQueryWithLegacyApi.removeListener?.(onDesktop)
  }, [])

  const isExpanded = pinned || expanded
  const collapsed = !isExpanded
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user?.role === 'admin')

  const getUserInitials = (fullName: string) => fullName.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()

  const renderSidebarNav = (isCollapsed: boolean, onNavigate?: () => void) => (
    <nav className={`${isCollapsed ? 'px-2' : 'px-3'} flex-1 py-4 space-y-1`}>
      {!isCollapsed && <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.12em] text-neutral-400">{t('nav.navigation')}</p>}
      {visibleNavItems.map(({ to, labelKey, icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          aria-label={isCollapsed ? t(labelKey) : undefined}
          className={({ isActive }) =>
            `flex items-center ${isCollapsed ? 'justify-center h-9 w-9 mx-auto px-0' : 'px-3 py-2'} rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-50 hover:bg-white/10'
            }`
          }
          title={isCollapsed ? t(labelKey) : undefined}
        >
          {isCollapsed
            ? icon
            : (
                <>
                  <span className="mr-2">{icon}</span>
                  <span>{t(labelKey)}</span>
                </>
              )}
        </NavLink>
      ))}
    </nav>
  )

  const renderSidebarFooter = (isCollapsed: boolean, onNavigate?: () => void) => (
    <div className="px-3 py-4 border-t border-white/10 space-y-2">
      {!isCollapsed && user && (
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-brand text-white'
                : 'text-neutral-400 hover:text-neutral-50 hover:bg-white/10'
            }`
          }
        >
          <div className="w-6 h-6 rounded-full bg-brand-light flex items-center justify-center shrink-0">
            <span className="text-[10px] font-medium text-brand-text">{getUserInitials(user.full_name)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate leading-tight">{user.full_name}</p>
            <p className="text-[10px] text-neutral-400 truncate leading-tight">{user.email}</p>
          </div>
        </NavLink>
      )}
      {isCollapsed && user && (
        <NavLink
          to="/profile"
          onClick={onNavigate}
          aria-label={t('nav.myProfile')}
          title={t('nav.myProfile')}
          className={({ isActive }) =>
            `flex items-center justify-center h-9 w-9 mx-auto rounded-lg transition-colors ${
              isActive ? 'bg-brand' : 'text-neutral-400 hover:text-neutral-50 hover:bg-white/10'
            }`
          }
        >
          <span className="text-xs font-medium">{getUserInitials(user.full_name)}</span>
        </NavLink>
      )}
      <button
        onClick={handleLogout}
        data-testid="logout-button"
        aria-label={t('nav.logout')}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center h-9 w-9 mx-auto px-0' : 'px-3 py-2'} rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-50 hover:bg-white/10 transition-colors`}
        title={isCollapsed ? t('nav.logout') : undefined}
      >
        {isCollapsed
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
                <span>{t('nav.logout')}</span>
              </>
            )}
      </button>
      {!isCollapsed && (
        <div className="px-3 pt-1">
          <LanguageSwitcher />
        </div>
      )}
    </div>
  )

  return (
    <div className="app-page flex h-screen">
      {/* Sidebar desktop */}
      <aside
        className="relative hidden w-20 shrink-0 overflow-visible lg:block"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocusCapture={() => {
          clearTimers()
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            scheduleClose()
          }
        }}
      >
        <div
          className={`${collapsed ? 'w-20' : 'w-60 shadow-lg'} absolute left-0 top-0 h-full bg-neutral-900 text-neutral-50 border-r border-neutral-100 flex flex-col z-[120]`}
        >
          {/* Logo */}
          <div className={`${collapsed ? 'px-2 py-3 flex-col items-center gap-2' : 'px-4 py-4 items-center gap-2'} border-b border-white/10 flex`}>
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V17a1 1 0 11-2 0v-.07A7.003 7.003 0 015 10h1a6 6 0 0012 0h1a7.003 7.003 0 01-6 6.93z" />
              </svg>
            </div>
            {!collapsed && <span className="text-base font-medium tracking-tight text-neutral-50">{t('common.atlasFinance')}</span>}
            <button
              type="button"
              onClick={handleTogglePin}
              className={`${collapsed ? 'mt-1 h-8 w-8' : 'ml-auto h-8 w-8'} inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-50 hover:bg-white/10 transition-colors`}
              aria-label={pinned ? t('nav.unpinSidebar') : t('nav.pinSidebar')}
              title={`${pinned ? t('nav.unpinSidebar') : t('nav.pinSidebar')} (${t('nav.sidebarShortcut')})`}
            >
              {pinned
                ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h8l-1 6 4 4v2H5v-2l4-4-1-6z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v6" />
                    </svg>
                  )
                : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h8l-1 6 4 4v2H5v-2l4-4-1-6z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l16-16" />
                    </svg>
                  )}
            </button>
          </div>
          {renderSidebarNav(collapsed)}
          {renderSidebarFooter(collapsed)}
        </div>
      </aside>

      {/* Sidebar mobile */}
      <button
        type="button"
        className="fixed left-3 top-3 z-[140] inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-100 bg-white text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50 lg:hidden"
        aria-label={mobileMenuOpen ? t('nav.closeSidebar') : t('nav.openSidebar')}
        onClick={() => setMobileMenuOpen((current) => !current)}
      >
        {mobileMenuOpen
          ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            )
          : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
      </button>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[120] bg-neutral-900/45 backdrop-blur-[1px] lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-[130] w-72 max-w-[85vw] bg-neutral-900 text-neutral-50 border-r border-neutral-100 flex flex-col shadow-lg lg:hidden">
            <div className="px-4 py-4 items-center gap-2 border-b border-white/10 flex">
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V17a1 1 0 11-2 0v-.07A7.003 7.003 0 015 10h1a6 6 0 0012 0h1a7.003 7.003 0 01-6 6.93z" />
                </svg>
              </div>
              <span className="text-base font-medium tracking-tight text-neutral-50">{t('common.atlasFinance')}</span>
              <button
                type="button"
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-50 hover:bg-white/10 transition-colors"
                aria-label={t('nav.closeSidebar')}
                title={t('nav.closeSidebar')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {renderSidebarNav(false, () => setMobileMenuOpen(false))}
            {renderSidebarFooter(false, () => setMobileMenuOpen(false))}
          </aside>
        </>
      )}

      {/* Main content */}
      <main className={`app-page flex-1 overflow-y-auto overflow-x-hidden p-4 pt-16 sm:p-6 sm:pt-6 transition-[padding-left] duration-200 ${isExpanded ? 'lg:pl-44' : 'lg:pl-6'}`}>
        <Outlet />
      </main>
    </div>
  )
}
