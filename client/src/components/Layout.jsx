import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const NAV_SECTIONS = [
  {
    label: 'Inteligencia',
    items: [
      { to: '/dashboard', label: 'Resumen', hint: 'Metricas y rentabilidad', icon: ChartIcon },
      { to: '/productos', label: 'Productos', hint: 'Catalogo y margenes', icon: BoxIcon },
      { to: '/insights', label: 'Insights', hint: 'Analisis y comparativas', icon: LightbulbIcon },
    ],
  },
  {
    label: 'Operacion',
    items: [
      { to: '/cargar', label: 'Cargar datos', hint: 'Ventas e inversion', icon: UploadIcon },
      { to: '/tareas', label: 'Tareas', hint: 'Flujo operativo diario', icon: CheckIcon },
      { to: '/configuracion', label: 'Configuracion', hint: 'Preferencias y moneda', icon: SettingsIcon },
    ],
  },
]

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/productos': 'Productos',
  '/insights': 'Insights',
  '/cargar': 'Cargar datos',
  '/tareas': 'Tareas',
  '/tareas/dashboard': 'Stats de tareas',
  '/configuracion': 'Configuracion',
  '/admin': 'Administracion',
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const base = PAGE_TITLES[location.pathname] ?? 'Guillon AP'
    document.title = base === 'Guillon AP' ? 'Guillon AP' : `${base} | Guillon AP`
  }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const mobileNav = [
    { to: '/dashboard', label: 'Inicio', icon: ChartIcon },
    { to: '/productos', label: 'Productos', icon: BoxIcon },
    { to: '/cargar', label: 'Cargar', icon: UploadIcon },
    { to: '/tareas', label: 'Tareas', icon: CheckIcon },
    { to: '/configuracion', label: 'Ajustes', icon: SettingsIcon },
  ]

  return (
    <div className="sidebar-layout">
      <aside className="sidebar-fixed">
        <div className="px-5 pt-5 pb-4 border-b border-white/6">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[linear-gradient(135deg,#f5b641_0%,#ffcf73_100%)] text-[#08111f] flex items-center justify-center shrink-0 shadow-[0_12px_30px_rgba(245,182,65,0.28)]">
                <span className="font-display font-extrabold text-lg">G</span>
              </div>
              <div>
                <p className="font-display text-white font-bold text-[18px] leading-tight tracking-tight">
                  Guillon <span className="text-[#f5b641]">AP</span>
                </p>
                <p className="text-[#7d8ca5] text-[11px] uppercase tracking-[0.24em] mt-1">
                  Business Command
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/7 bg-white/[0.03] px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#7d8ca5]">Estado</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Operacion centralizada</p>
                  <p className="text-xs text-[#9eb0cb] mt-1">Ventas, tareas y control de productos</p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_16px_rgba(34,197,94,0.7)]" />
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="text-[#4f6278] text-[10.5px] font-semibold tracking-[0.28em] uppercase px-3.5 mb-2.5">
                {section.label}
              </p>

              <div className="space-y-1.5">
                {section.items.map(({ to, label, hint, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-[20px] px-3.5 py-3.5 border transition-all duration-200 ${
                        isActive
                          ? 'border-[#f5b641]/22 bg-[linear-gradient(135deg,rgba(245,182,65,0.12)_0%,rgba(245,182,65,0.04)_55%,rgba(77,215,255,0.04)_100%)] shadow-[0_8px_22px_rgba(7,12,24,0.42)]'
                          : 'border-transparent hover:border-white/[0.06] hover:bg-white/[0.025] hover:shadow-[0_4px_14px_rgba(7,12,24,0.22)]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isActive
                            ? 'bg-[#f5b641] text-[#091321] shadow-[0_4px_16px_rgba(245,182,65,0.4)]'
                            : 'bg-white/[0.04] text-[#8a9dba] group-hover:bg-white/[0.07] group-hover:text-[#c8d8ee]'
                        }`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>

                        <div className="min-w-0">
                          <p className={`text-[13.5px] font-semibold tracking-[-0.01em] ${isActive ? 'text-white' : 'text-[#c8d5ea] group-hover:text-white transition-colors duration-200'}`}>
                            {label}
                          </p>
                          <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-[#e8c97a]' : 'text-[#4f6278] group-hover:text-[#6f809d] transition-colors duration-200'}`}>
                            {hint}
                          </p>
                        </div>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {user?.role === 'admin' && (
            <div>
              <p className="text-[#4f6278] text-[10.5px] font-semibold tracking-[0.28em] uppercase px-3.5 mb-2.5">
                Sistema
              </p>

              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-[20px] px-3.5 py-3.5 border transition-all duration-200 ${
                    isActive
                      ? 'border-[#8c7cff]/22 bg-[linear-gradient(135deg,rgba(140,124,255,0.12)_0%,rgba(140,124,255,0.04)_55%,rgba(77,215,255,0.04)_100%)] shadow-[0_8px_22px_rgba(7,12,24,0.42)]'
                      : 'border-transparent hover:border-white/[0.06] hover:bg-white/[0.025] hover:shadow-[0_4px_14px_rgba(7,12,24,0.22)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                      isActive ? 'bg-[#8c7cff] text-white shadow-[0_4px_16px_rgba(140,124,255,0.4)]' : 'bg-white/[0.04] text-[#8a9dba] group-hover:bg-white/[0.07] group-hover:text-[#c8d8ee]'
                    }`}>
                      <ShieldIcon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className={`text-[14px] font-semibold ${isActive ? 'text-white' : 'text-[#d6e1f3]'}`}>Admin</p>
                      <p className="text-[11px] text-[#6f809d]">Permisos y configuracion</p>
                    </div>
                  </>
                )}
              </NavLink>
            </div>
          )}
        </nav>

        <div className="px-4 pb-5 pt-3 border-t border-white/6">
          <div className="card p-3.5">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-[linear-gradient(135deg,rgba(245,182,65,0.24),rgba(255,255,255,0.06))] border border-[#f5b641]/20 flex items-center justify-center">
                  <span className="text-[#f8d083] text-[13px] font-bold">{initials}</span>
                </div>
                <span className="absolute -right-1 -bottom-1 w-3 h-3 rounded-full border-2 border-[#0b1627] bg-[#22c55e] animate-pulse-dot" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white text-[14px] font-semibold truncate">{user?.name}</p>
                <p className="text-[#7d8ca5] text-[11px] capitalize mt-0.5 truncate">{user?.role}</p>
              </div>

              <button
                onClick={handleLogout}
                title="Cerrar sesion"
                className="w-10 h-10 rounded-2xl border border-white/[0.08] text-[#7d8ca5] hover:text-[#fb7185] hover:border-[#fb7185]/20 hover:bg-[#fb7185]/[0.06] transition-all duration-200 flex items-center justify-center shrink-0"
              >
                <LogoutIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="md:hidden sticky top-0 z-30 border-b border-white/6 bg-[#091321]/88 backdrop-blur-xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[linear-gradient(135deg,#f5b641_0%,#ffcf73_100%)] text-[#08111f] flex items-center justify-center">
                <span className="font-display font-black text-sm">G</span>
              </div>
              <div>
                <p className="font-display text-white font-bold text-[15px] leading-tight">
                  Guillon <span className="text-[#f5b641]">AP</span>
                </p>
                <p className="text-[#6f809d] text-[10px] uppercase tracking-[0.2em]">Command center</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user?.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className="w-10 h-10 rounded-2xl glass-pill text-[#9eb0cb] flex items-center justify-center"
                >
                  <ShieldIcon className="w-4.5 h-4.5" />
                </NavLink>
              )}
              <div className="w-10 h-10 rounded-2xl glass-pill text-[#f5d386] flex items-center justify-center text-sm font-bold">
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

      <nav className="bottom-nav">
        {mobileNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all min-w-[58px] ${
                isActive ? 'text-white' : 'text-[#6f809d]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  isActive ? 'bg-[#f5b641] text-[#08111f]' : 'bg-white/[0.03]'
                }`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[11px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

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
