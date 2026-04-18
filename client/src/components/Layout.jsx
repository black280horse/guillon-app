import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  {
    group: 'Análisis',
    items: [
      { to: '/',          label: 'Home',         icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 0-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1m6-6v.01', accent: '#F59E0B', end: true },
      { to: '/dashboard', label: 'Dashboard',    icon: 'M4 14h6v6H4zM14 10h6v10h-6zM4 4h6v6H4zM14 4h6v2h-6z', accent: '#F59E0B' },
      { to: '/productos', label: 'Productos',    icon: 'M12 2l9 5v10l-9 5-9-5V7l9-5zm0 0v18m9-13L12 12 3 7',  accent: '#22D3EE' },
      { to: '/insights',  label: 'Insights',     icon: 'M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', accent: '#A78BFA' },
    ],
  },
  {
    group: 'Operación',
    items: [
      { to: '/cargar',        label: 'Cargar datos',  icon: 'M12 16V4m0 0-4 4m4-4 4 4M5 20h14',              accent: '#34D399' },
      { to: '/tareas',        label: 'Tareas',        icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4', accent: '#818CF8' },
      { to: '/configuracion', label: 'Configuración', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', accent: '#F87171' },
    ],
  },
]

const PAGE_TITLES = {
  '/dashboard':        'Dashboard',
  '/productos':        'Productos',
  '/insights':         'Insights',
  '/cargar':           'Cargar datos',
  '/tareas':           'Tareas',
  '/tareas/dashboard': 'Stats de tareas',
  '/configuracion':    'Configuración',
  '/admin':            'Administración',
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    const base = PAGE_TITLES[location.pathname] ?? 'Guillon AP'
    document.title = base === 'Guillon AP' ? 'Guillon AP' : `${base} — Guillon AP`
  }, [location.pathname])

  function handleLogout() { logout(); navigate('/login') }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const mobileNav = [
    { to: '/dashboard',     label: 'Inicio',    icon: 'M4 14h6v6H4zM14 10h6v10h-6zM4 4h6v6H4z' },
    { to: '/productos',     label: 'Productos', icon: 'M12 2l9 5v10l-9 5-9-5V7l9-5zm0 0v18' },
    { to: '/cargar',        label: 'Cargar',    icon: 'M12 16V4m0 0-4 4m4-4 4 4M5 20h14' },
    { to: '/tareas',        label: 'Tareas',    icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4' },
    { to: '/configuracion', label: 'Ajustes',   icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
  ]

  return (
    <div className="sidebar-layout">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="sidebar-fixed">

        {/* Brand */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 55%, #F59E0B 100%)',
                boxShadow: '0 0 20px rgba(245,158,11,0.35), 0 4px 12px rgba(0,0,0,0.40)',
              }}
            >
              <span className="relative z-10 text-[#1A0A00] font-bold text-[16px] leading-none" style={{ letterSpacing: '-0.04em' }}>G</span>
            </div>
            {/* Wordmark */}
            <div>
              <p className="text-white font-semibold text-[15px] leading-none" style={{ letterSpacing: '-0.03em' }}>
                Guillon
              </p>
              <p className="text-[10px] mt-0.5 font-medium tracking-[0.16em] uppercase" style={{ color: '#F59E0B', opacity: 0.8 }}>
                Business OS
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-white/[0.06]" />

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-5 overflow-y-auto">
          {NAV.map(section => (
            <div key={section.group}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.20em] px-3 mb-2"
                style={{ color: 'rgba(255,255,255,0.22)' }}>
                {section.group}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ to, label, icon, accent, end: matchEnd }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={matchEnd}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2 rounded-[10px] px-3 py-2.5 transition-all duration-150 ${
                        isActive
                          ? 'bg-white/[0.07]'
                          : 'hover:bg-white/[0.06]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active indicator bar */}
                        {isActive && (
                          <span
                            className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-full"
                            style={{ background: accent }}
                          />
                        )}

                        {/* Icon container */}
                        <div
                          className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 transition-all duration-150"
                          style={isActive ? {
                            background: `${accent}1A`,
                            boxShadow: `0 0 12px ${accent}25`,
                          } : {}}
                        >
                          <svg
                            className="w-[15px] h-[15px] transition-colors duration-150"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            style={{ color: isActive ? accent : 'rgba(255,255,255,0.35)' }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                          </svg>
                        </div>

                        {/* Label */}
                        <span
                          className="text-[12.5px] font-medium leading-[1.4] transition-colors duration-150 truncate min-w-0"
                          style={{ color: isActive ? '#F4F4F6' : 'rgba(255,255,255,0.50)' }}
                        >
                          {label}
                        </span>

                        {/* Trailing dot if active */}
                        {isActive && (
                          <span
                            className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: accent, opacity: 0.7 }}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Admin */}
          {user?.role === 'admin' && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.20em] px-3 mb-2"
                style={{ color: 'rgba(255,255,255,0.22)' }}>
                Sistema
              </p>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-all duration-150 ${
                    isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-full bg-[#A78BFA]" />
                    )}
                    <div
                      className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                      style={isActive ? { background: 'rgba(167,139,250,0.12)', boxShadow: '0 0 12px rgba(167,139,250,0.2)' } : {}}
                    >
                      <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        style={{ color: isActive ? '#A78BFA' : 'rgba(255,255,255,0.35)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3zm-2.5 9 1.8 1.8L15 10.1" />
                      </svg>
                    </div>
                    <span className="text-[12.5px] font-medium leading-[1.4]"
                      style={{ color: isActive ? '#F4F4F6' : 'rgba(255,255,255,0.50)' }}>
                      Admin
                    </span>
                  </>
                )}
              </NavLink>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="mx-5 h-px bg-white/[0.06]" />
        <div className="px-3 py-4">
          <div className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[13px] font-bold"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.20) 0%, rgba(245,158,11,0.10) 100%)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  color: '#F59E0B',
                }}
              >
                {initials}
              </div>
              <span
                className="absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full border-[1.5px] bg-[#34D399] animate-pulse-dot"
                style={{ borderColor: '#0E0E14' }}
              />
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold leading-none text-[#F4F4F6] truncate"
                style={{ letterSpacing: '-0.01em' }}>
                {user?.name}
              </p>
              <p className="text-[10.5px] mt-0.5 capitalize truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
                {user?.role}
              </p>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all shrink-0"
              style={{ color: 'rgba(255,255,255,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'transparent' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M10 17v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1m4 10 5-5m0 0-5-5m5 5H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <div className="main-content">
        {/* Mobile header */}
        <header
          className="md:hidden sticky top-0 z-30 px-4 py-3"
          style={{
            background: 'rgba(8,8,12,0.92)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#F59E0B,#FCD34D)', boxShadow: '0 0 14px rgba(245,158,11,0.30)' }}
              >
                <span className="text-[#1A0A00] font-bold text-[13px]">G</span>
              </div>
              <p className="text-white font-semibold text-[14px]" style={{ letterSpacing: '-0.03em' }}>
                Guillon <span style={{ color: '#F59E0B' }}>AP</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className="w-8 h-8 rounded-[8px] glass-pill flex items-center justify-center"
                  style={{ color: '#A78BFA' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z" />
                  </svg>
                </NavLink>
              )}
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.22)',
                  color: '#F59E0B',
                }}
              >
                {initials}
              </div>
            </div>
          </div>
        </header>

        <div className="main-frame">
          <div className="main-surface">
            <main className="page-shell animate-fade-up">{children}</main>
          </div>
        </div>
      </div>

      {/* ── Bottom nav (mobile) ──────────────────────────── */}
      <nav className="bottom-nav">
        {mobileNav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-[10px] px-3 py-1.5 min-w-[52px] transition-all ${
                isActive ? '' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all"
                  style={isActive ? {
                    background: 'rgba(245,158,11,0.15)',
                    boxShadow: '0 0 14px rgba(245,158,11,0.25)',
                  } : {
                    background: 'rgba(255,255,255,0.05)',
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    style={{ color: isActive ? '#F59E0B' : 'rgba(255,255,255,0.40)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                  </svg>
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? '#F4F4F6' : 'rgba(255,255,255,0.40)' }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
