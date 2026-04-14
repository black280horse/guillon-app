import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  {
    group: 'Análisis',
    items: [
      { to: '/dashboard', label: 'Dashboard',    icon: 'M4 14h6v6H4zM14 10h6v10h-6zM4 4h6v6H4zM14 4h6v2h-6z' },
      { to: '/productos', label: 'Productos',    icon: 'M12 2l9 5v10l-9 5-9-5V7l9-5zm0 0v18m9-13L12 12 3 7' },
      { to: '/insights',  label: 'Insights',     icon: 'M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    ],
  },
  {
    group: 'Operación',
    items: [
      { to: '/cargar',        label: 'Cargar datos',  icon: 'M12 16V4m0 0-4 4m4-4 4 4M5 20h14' },
      { to: '/tareas',        label: 'Tareas',        icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4' },
      { to: '/configuracion', label: 'Configuración', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
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
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
              style={{ background: '#0075de' }}
            >
              <span className="text-white font-bold text-[15px] leading-none">G</span>
            </div>
            <div>
              <p className="font-semibold text-[14px] leading-none" style={{ color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.02em' }}>
                Guillon AP
              </p>
              <p className="text-[10px] mt-0.5 font-medium" style={{ color: '#a39e98', letterSpacing: '0.08em' }}>
                Business OS
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
          {NAV.map(section => (
            <div key={section.group}>
              <p
                className="text-[10px] font-semibold uppercase px-2 mb-1"
                style={{ color: '#a39e98', letterSpacing: '0.12em' }}
              >
                {section.group}
              </p>
              <div className="space-y-px">
                {section.items.map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 transition-all duration-100 ${
                        isActive
                          ? 'bg-[#f2f9ff]'
                          : 'hover:bg-black/[0.04]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <svg
                          className="w-[15px] h-[15px] shrink-0 transition-colors duration-100"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          style={{ color: isActive ? '#0075de' : '#a39e98' }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                        </svg>
                        <span
                          className="text-[13px] font-medium leading-none transition-colors duration-100"
                          style={{ color: isActive ? '#0075de' : '#615d59' }}
                        >
                          {label}
                        </span>
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
              <p className="text-[10px] font-semibold uppercase px-2 mb-1"
                style={{ color: '#a39e98', letterSpacing: '0.12em' }}>
                Sistema
              </p>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 transition-all duration-100 ${
                    isActive ? 'bg-[#f2f9ff]' : 'hover:bg-black/[0.04]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      style={{ color: isActive ? '#0075de' : '#a39e98' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3zm-2.5 9 1.8 1.8L15 10.1" />
                    </svg>
                    <span className="text-[13px] font-medium" style={{ color: isActive ? '#0075de' : '#615d59' }}>
                      Admin
                    </span>
                  </>
                )}
              </NavLink>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="mx-3 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
        <div className="px-2 py-3">
          <div
            className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 transition-colors cursor-default"
            style={{ ':hover': { background: 'rgba(0,0,0,0.04)' } }}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{
                background: '#0075de',
                color: '#ffffff',
              }}
            >
              {initials}
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold leading-none truncate" style={{ color: 'rgba(0,0,0,0.90)', letterSpacing: '-0.01em' }}>
                {user?.name}
              </p>
              <p className="text-[10.5px] mt-0.5 capitalize truncate" style={{ color: '#a39e98' }}>
                {user?.role}
              </p>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="w-6 h-6 rounded-[4px] flex items-center justify-center transition-all shrink-0"
              style={{ color: '#a39e98' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#a39e98'; e.currentTarget.style.background = 'transparent' }}
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
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-[6px] flex items-center justify-center"
                style={{ background: '#0075de' }}
              >
                <span className="text-white font-bold text-[12px]">G</span>
              </div>
              <p className="font-semibold text-[14px]" style={{ color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.02em' }}>
                Guillon AP
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className="w-8 h-8 rounded-[6px] flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.05)', color: '#615d59' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z" />
                  </svg>
                </NavLink>
              )}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: '#0075de', color: '#ffffff' }}
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
            className="flex flex-col items-center gap-1 rounded-[6px] px-3 py-1.5 min-w-[52px] transition-all"
          >
            {({ isActive }) => (
              <>
                <div
                  className="w-8 h-8 rounded-[6px] flex items-center justify-center transition-all"
                  style={isActive ? { background: '#f2f9ff' } : { background: 'transparent' }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    style={{ color: isActive ? '#0075de' : '#a39e98' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                  </svg>
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? '#0075de' : '#a39e98' }}
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
