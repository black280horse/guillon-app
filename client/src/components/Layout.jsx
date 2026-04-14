import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const NAV_SECTIONS = [
  {
    label: 'Inteligencia',
    items: [
      { to: '/dashboard',  label: 'Resumen',      hint: 'Métricas y rentabilidad',   icon: ChartIcon },
      { to: '/productos',  label: 'Productos',     hint: 'Catálogo y márgenes',       icon: BoxIcon },
      { to: '/insights',   label: 'Insights',      hint: 'Análisis y comparativas',   icon: LightbulbIcon },
    ],
  },
  {
    label: 'Operación',
    items: [
      { to: '/cargar',        label: 'Cargar datos', hint: 'Ventas e inversión',       icon: UploadIcon },
      { to: '/tareas',        label: 'Tareas',        hint: 'Flujo operativo diario',  icon: CheckIcon },
      { to: '/configuracion', label: 'Configuración', hint: 'Preferencias y cuenta',  icon: SettingsIcon },
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
    document.title = base === 'Guillon AP' ? 'Guillon AP' : `${base} | Guillon AP`
  }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const mobileNav = [
    { to: '/dashboard',     label: 'Inicio',    icon: ChartIcon },
    { to: '/productos',     label: 'Productos', icon: BoxIcon },
    { to: '/cargar',        label: 'Cargar',    icon: UploadIcon },
    { to: '/tareas',        label: 'Tareas',    icon: CheckIcon },
    { to: '/configuracion', label: 'Ajustes',   icon: SettingsIcon },
  ]

  return (
    <div className="sidebar-layout">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="sidebar-fixed">

        {/* Brand */}
        <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 px-1">
            <div
              className="w-8 h-8 rounded-[7px] flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #E8A020 0%, #f5c842 100%)',
                boxShadow: '0 4px 14px rgba(232,160,32,0.30)',
              }}
            >
              <span className="text-[#08111f] font-bold text-[14px] leading-none">G</span>
            </div>
            <div>
              <p className="text-white font-semibold text-[15px] leading-tight tracking-[-0.02em]">
                Guillon <span style={{ color: '#E8A020' }}>AP</span>
              </p>
              <p className="text-[#4a5c72] text-[10px] uppercase tracking-[0.22em] mt-0.5">
                Business OS
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="text-[#3d5068] text-[10px] font-semibold tracking-[0.24em] uppercase px-2 mb-1.5">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ to, label, hint, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 transition-all duration-150 ${
                        isActive
                          ? 'bg-white/[0.07] border border-white/[0.10]'
                          : 'border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`w-7 h-7 rounded-[5px] flex items-center justify-center shrink-0 transition-all duration-150 ${
                          isActive
                            ? 'text-[#E8A020]'
                            : 'text-[#4a5c72] group-hover:text-[#8a9dba]'
                        }`}>
                          <Icon className="w-[15px] h-[15px]" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[13px] font-medium leading-tight tracking-[-0.01em] ${
                            isActive ? 'text-white' : 'text-[#8fa3be] group-hover:text-[#c8d5ea]'
                          }`}>
                            {label}
                          </p>
                        </div>
                        {isActive && (
                          <div
                            className="ml-auto w-1 h-4 rounded-full shrink-0"
                            style={{ background: '#E8A020', opacity: 0.8 }}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {user?.role === 'admin' && (
            <div>
              <p className="text-[#3d5068] text-[10px] font-semibold tracking-[0.24em] uppercase px-2 mb-1.5">
                Sistema
              </p>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 transition-all duration-150 ${
                    isActive
                      ? 'bg-white/[0.07] border border-white/[0.10]'
                      : 'border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-7 h-7 rounded-[5px] flex items-center justify-center shrink-0 ${
                      isActive ? 'text-[#8c7cff]' : 'text-[#4a5c72] group-hover:text-[#8a9dba]'
                    }`}>
                      <ShieldIcon className="w-[15px] h-[15px]" />
                    </div>
                    <p className={`text-[13px] font-medium tracking-[-0.01em] ${
                      isActive ? 'text-white' : 'text-[#8fa3be] group-hover:text-[#c8d5ea]'
                    }`}>
                      Admin
                    </p>
                    {isActive && (
                      <div className="ml-auto w-1 h-4 rounded-full shrink-0 bg-[#8c7cff]" style={{ opacity: 0.8 }} />
                    )}
                  </>
                )}
              </NavLink>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="relative shrink-0">
              <div
                className="w-7 h-7 rounded-[5px] flex items-center justify-center"
                style={{
                  background: 'rgba(232,160,32,0.15)',
                  border: '1px solid rgba(232,160,32,0.20)',
                }}
              >
                <span className="text-[#E8A020] text-[11px] font-semibold">{initials}</span>
              </div>
              <span className="absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full border border-[#07111f] bg-[#22c55e] animate-pulse-dot" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#c8d5ea] text-[12px] font-medium truncate leading-tight">{user?.name}</p>
              <p className="text-[#3d5068] text-[10px] capitalize truncate">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="w-7 h-7 rounded-[5px] text-[#3d5068] hover:text-[#fb7185] hover:bg-[#fb7185]/[0.08] transition-all duration-150 flex items-center justify-center shrink-0"
            >
              <LogoutIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="main-content">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 border-b border-white/[0.06] px-4 py-3"
          style={{ background: 'rgba(7,17,31,0.92)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-[6px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #E8A020 0%, #f5c842 100%)' }}
              >
                <span className="text-[#08111f] font-bold text-[12px]">G</span>
              </div>
              <p className="text-white font-semibold text-[14px] tracking-[-0.02em]">
                Guillon <span style={{ color: '#E8A020' }}>AP</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className="w-8 h-8 rounded-[6px] glass-pill text-[#8a9dba] flex items-center justify-center"
                >
                  <ShieldIcon className="w-4 h-4" />
                </NavLink>
              )}
              <div
                className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[11px] font-semibold"
                style={{ background: 'rgba(232,160,32,0.12)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.18)' }}
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

      {/* ── Bottom mobile nav ─────────────────────────────────────────── */}
      <nav className="bottom-nav">
        {mobileNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-[8px] px-3 py-1.5 transition-all min-w-[52px] ${
                isActive ? 'text-white' : 'text-[#4a5c72]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-9 h-9 rounded-[7px] flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#E8A020] text-[#08111f]'
                    : 'bg-white/[0.04] text-[#5a6e88]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────────────── */
function ChartIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19h16M7 16V8m5 8V5m5 11v-6" />
    </svg>
  )
}
function BoxIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v18m8-13.5l-8 4.5-8-4.5" />
    </svg>
  )
}
function LightbulbIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3a6 6 0 0 0-3.95 10.52c.67.57 1.1 1.38 1.2 2.25L9.4 17h5.2l.15-1.23c.1-.87.54-1.68 1.2-2.25A6 6 0 0 0 12 3zm-2 17h4m-3 1h2" />
    </svg>
  )
}
function UploadIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 16V4m0 0-4 4m4-4 4 4M5 19h14" />
    </svg>
  )
}
function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 11.5 11.5 14 16 9.5M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  )
}
function ShieldIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3zm-2.5 9 1.8 1.8L15 10.1" />
    </svg>
  )
}
function LogoutIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 17v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1m4 10 5-5m0 0-5-5m5 5H9" />
    </svg>
  )
}
function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m10.5 3.75 1-1.5 1 1.5a2.25 2.25 0 0 0 2.35 1l1.72-.42.42 1.72a2.25 2.25 0 0 0 1 2.35l1.5 1-1.5 1a2.25 2.25 0 0 0-1 2.35l.42 1.72-1.72.42a2.25 2.25 0 0 0-2.35 1l-1 1.5-1-1.5a2.25 2.25 0 0 0-2.35-1l-1.72.42-.42-1.72a2.25 2.25 0 0 0-1-2.35l-1.5-1 1.5-1a2.25 2.25 0 0 0 1-2.35l-.42-1.72 1.72-.42a2.25 2.25 0 0 0 2.35-1ZM12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" />
    </svg>
  )
}
