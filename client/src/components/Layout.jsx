import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/dashboard',     label: 'Dashboard',    icon: 'M4 14h6v6H4zM14 10h6v10h-6zM4 4h6v6H4zM14 4h6v2h-6z',             accent: '#F59E0B' },
  { to: '/productos',     label: 'Productos',    icon: 'M12 2l9 5v10l-9 5-9-5V7l9-5zm0 0v18m9-13L12 12 3 7',              accent: '#22D3EE' },
  { to: '/insights',      label: 'Insights',     icon: 'M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', accent: '#A78BFA' },
  { to: '/cargar',        label: 'Cargar datos', icon: 'M12 16V4m0 0-4 4m4-4 4 4M5 20h14',                                accent: '#34D399' },
  { to: '/tareas',        label: 'Tareas',       icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4', accent: '#818CF8' },
  { to: '/configuracion', label: 'Ajustes',      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', accent: '#F87171' },
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

const mobileNav = [
  { to: '/dashboard',     label: 'Inicio',    icon: 'M4 14h6v6H4zM14 10h6v10h-6zM4 4h6v6H4z' },
  { to: '/productos',     label: 'Productos', icon: 'M12 2l9 5v10l-9 5-9-5V7l9-5zm0 0v18' },
  { to: '/cargar',        label: 'Cargar',    icon: 'M12 16V4m0 0-4 4m4-4 4 4M5 20h14' },
  { to: '/tareas',        label: 'Tareas',    icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4' },
  { to: '/configuracion', label: 'Ajustes',   icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
]

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

  return (
    <div className="sidebar-layout">

      {/* ── Sidebar 68px icon-only rail ─────────────────── */}
      <aside className="sidebar-fixed">

        {/* Brand mark */}
        <div className="flex items-center justify-center py-5">
          <NavLink to="/dashboard">
            <div
              className="w-9 h-9 rounded-[11px] flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 55%, #F59E0B 100%)',
                boxShadow: '0 0 20px rgba(245,158,11,0.35), 0 4px 12px rgba(0,0,0,0.40)',
              }}
            >
              <span className="text-[#1A0A00] font-bold text-[16px] leading-none" style={{ letterSpacing: '-0.04em' }}>G</span>
            </div>
          </NavLink>
        </div>

        <div className="mx-3 h-px bg-white/[0.06] mb-3" />

        {/* Nav items */}
        <nav className="flex-1 flex flex-col items-center gap-1 px-2">
          {NAV.map(({ to, label, icon, accent }) => (
            <NavLink
              key={to}
              to={to}
              className="nav-item-wrap relative w-full"
            >
              {({ isActive }) => (
                <>
                  {/* Active left indicator */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-full"
                      style={{ background: accent }}
                    />
                  )}
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center mx-auto transition-all duration-150"
                    style={isActive ? {
                      background: `${accent}1A`,
                      boxShadow: `0 0 14px ${accent}25`,
                    } : {}}
                    onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg
                      className="w-[17px] h-[17px]"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      style={{ color: isActive ? accent : 'rgba(255,255,255,0.38)' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                    </svg>
                  </div>
                  <span className="nav-tooltip">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Admin */}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className="nav-item-wrap relative w-full">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-full bg-[#A78BFA]" />
                  )}
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center mx-auto transition-all duration-150"
                    style={isActive ? { background: 'rgba(167,139,250,0.12)', boxShadow: '0 0 14px rgba(167,139,250,0.2)' } : {}}
                    onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      style={{ color: isActive ? '#A78BFA' : 'rgba(255,255,255,0.38)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3zm-2.5 9 1.8 1.8L15 10.1" />
                    </svg>
                  </div>
                  <span className="nav-tooltip">Admin</span>
                </>
              )}
            </NavLink>
          )}
        </nav>

        {/* User footer */}
        <div className="mx-3 h-px bg-white/[0.06] mt-3" />
        <div className="flex flex-col items-center gap-2 py-4">
          {/* Avatar with logout on hover */}
          <div className="nav-item-wrap relative">
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="relative w-[34px] h-[34px] rounded-[8px] flex items-center justify-center text-[12px] font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.20) 0%, rgba(245,158,11,0.10) 100%)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#F59E0B',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.30)'; e.currentTarget.style.color = '#F87171' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.20) 0%, rgba(245,158,11,0.10) 100%)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)'; e.currentTarget.style.color = '#F59E0B' }}
            >
              {initials}
              <span
                className="absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full border-[1.5px] bg-[#34D399] animate-pulse-dot"
                style={{ borderColor: '#0E0E14' }}
              />
            </button>
            <span className="nav-tooltip">{user?.name ?? 'Cerrar sesión'}</span>
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
            className="flex flex-col items-center gap-1 rounded-[10px] px-3 py-1.5 min-w-[52px] transition-all"
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
