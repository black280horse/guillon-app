import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'
import { usePreferences } from '../context/PreferencesContext'
import { useToast } from '../context/ToastContext'

function Icon({ path, className = 'w-4 h-4', stroke = 1.8 }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke} d={path} /></svg>
}

function RoasBadge({ roas }) {
  if (roas == null) return null
  const tone = roas >= 3
    ? 'bg-[#22c55e]/10 text-[#63d68d] border-[#22c55e]/18'
    : roas >= 1.5
    ? 'bg-[#f5b641]/10 text-[#ffd27d] border-[#f5b641]/18'
    : 'bg-[#fb7185]/10 text-[#ff9ca8] border-[#fb7185]/18'
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-[5px] font-semibold border ${tone}`}>
      {roas}x ROAS
    </span>
  )
}

function SummaryKpi({ label, value, color, icon }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${color.bg}`}>
        <Icon className={`w-4 h-4 ${color.icon}`} path={icon} />
      </div>
      <div className="min-w-0">
        <p className="text-[#5a6d87] text-[10.5px] uppercase tracking-[0.2em]">{label}</p>
        <p className={`font-display text-[16px] font-bold leading-tight mt-0.5 ${color.text}`}>{value}</p>
      </div>
    </div>
  )
}

// ─── Product Modal ────────────────────────────────────────────────────────────

function ProductModal({ product, onClose, onSaved, onDeleted }) {
  const { addToast } = useToast()
  const isEdit = Boolean(product)
  const [name, setName] = useState(product?.name || '')
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) { addToast('El nombre es requerido', 'error'); return }
    setLoading(true)
    try {
      if (isEdit) {
        const res = await axios.patch(`/api/products/${product.id}`, { name: name.trim() })
        onSaved(res.data, 'edit')
        addToast('Producto actualizado', 'success')
      } else {
        const res = await axios.post('/api/products', { name: name.trim() })
        onSaved(res.data, 'create')
        addToast('Producto creado', 'success')
      }
      onClose()
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al guardar', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      await axios.delete(`/api/products/${product.id}`)
      onDeleted(product.id)
      addToast('Producto eliminado', 'info')
      onClose()
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al eliminar', 'error')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[440px] bg-[#131720] border border-white/[0.09] rounded-[16px] shadow-[0_32px_64px_rgba(0,0,0,0.65)] overflow-hidden"
        style={{ animation: 'modalIn 0.18s cubic-bezier(0.2,0,0,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.07]">
          <p className="text-[#8ea0bc] text-[11px] uppercase tracking-[0.16em] font-medium">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </p>
          <button onClick={onClose} className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[#52525b] hover:text-[#a1a1aa] hover:bg-white/[0.05] transition-all">
            <Icon className="w-4 h-4" path="M6 6l12 12M18 6 6 18" />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="px-5 py-5">
            <label className="block text-[11px] uppercase tracking-[0.14em] text-[#6b7280] font-medium mb-2">
              Nombre del producto
            </label>
            <input
              autoFocus
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Proteína Whey, Creatina…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-3 py-2.5 text-[14px] text-white placeholder:text-[#4a4a56] focus:outline-none focus:border-white/[0.16] transition-colors"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.07] gap-3">
            <div>
              {isEdit && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/8 text-[12px] font-medium transition-all"
                >
                  <Icon className="w-3.5 h-3.5" path="M6 7h12m-9 0V5h6v2m-7 0 1 12h8l1-12" />
                  Eliminar
                </button>
              )}
              {isEdit && confirmDelete && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#ef4444]">¿Confirmar?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-[8px] bg-[#ef4444]/15 text-[#ef4444] text-[12px] font-medium hover:bg-[#ef4444]/25 transition-all disabled:opacity-50"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-[8px] border border-white/[0.08] text-[#6b7280] text-[12px] font-medium hover:text-white transition-all"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-[10px] border border-white/[0.08] text-[#6b7280] hover:text-[#c0cee4] text-[12.5px] font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-[10px] bg-[#F59E0B] text-black text-[12.5px] font-medium disabled:opacity-50 hover:bg-[#E8A020] transition-all"
              >
                {loading ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Product avatar ───────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: 'rgba(167,139,250,0.18)', color: '#A78BFA' },
  { bg: 'rgba(245,158,11,0.18)',  color: '#F59E0B' },
  { bg: 'rgba(34,211,238,0.18)',  color: '#22D3EE' },
  { bg: 'rgba(52,211,153,0.18)',  color: '#34D399' },
  { bg: 'rgba(248,113,113,0.18)', color: '#F87171' },
  { bg: 'rgba(129,140,248,0.18)', color: '#818CF8' },
]

function ProductAvatar({ name, index }) {
  const { bg, color } = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 text-[11px] font-bold"
      style={{ background: bg, color }}
    >
      {initials}
    </div>
  )
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function ProductKpi({ label, value, sub, iconPath, iconBg, iconColor }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <svg className="w-5 h-5" fill="none" stroke={iconColor} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={iconPath} />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.38)' }}>{label}</p>
        <p className="text-[22px] font-bold leading-tight mt-0.5 text-white tabular-nums" style={{ letterSpacing: '-0.03em' }}>{value}</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>{sub}</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Products() {
  const navigate = useNavigate()
  const { formatCurrency } = usePreferences()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('revenue')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    axios.get('/api/products').then(r => setProducts(r.data)).finally(() => setLoading(false))
  }, [])

  const summary = useMemo(() => {
    const revenue    = products.reduce((a, p) => a + (p.total_revenue    ?? 0), 0)
    const investment = products.reduce((a, p) => a + (p.total_investment ?? 0), 0)
    return { revenue, investment, profit: revenue - investment }
  }, [products])

  const sortedFiltered = useMemo(() => {
    const base = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    return [...base].sort((a, b) => {
      if (sortBy === 'revenue')    return (b.total_revenue    ?? 0) - (a.total_revenue    ?? 0)
      if (sortBy === 'investment') return (b.total_investment ?? 0) - (a.total_investment ?? 0)
      if (sortBy === 'roas') {
        const ra = a.total_investment > 0 ? a.total_revenue / a.total_investment : 0
        const rb = b.total_investment > 0 ? b.total_revenue / b.total_investment : 0
        return rb - ra
      }
      const pa = (a.total_revenue ?? 0) - (a.total_investment ?? 0)
      const pb = (b.total_revenue ?? 0) - (b.total_investment ?? 0)
      return pb - pa
    })
  }, [products, search, sortBy])

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize))
  const paginated  = sortedFiltered.slice((page - 1) * pageSize, page * pageSize)

  function handleSaved(product, mode) {
    if (mode === 'create') setProducts(ps => [...ps, { ...product, total_revenue: 0, total_investment: 0, sales_count: 0 }])
    else setProducts(ps => ps.map(p => p.id === product.id ? { ...p, name: product.name } : p))
    setPage(1)
  }

  function handleDeleted(id) {
    setProducts(ps => ps.filter(p => p.id !== id))
    setPage(1)
  }

  return (
    <Layout>
      <div className="w-full space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold text-white leading-none" style={{ letterSpacing: '-0.04em' }}>
              Productos <span style={{ color: '#F59E0B' }}>comerciales</span>
            </h1>
            <p className="text-[12.5px] mt-2" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Catálogo, ingresos y rentabilidad por producto
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setModal({})}
              className="inline-flex items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[13px] font-semibold transition-all"
              style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#F4F4F6' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              <Icon className="w-4 h-4" stroke={2.2} path="M12 5v14M5 12h14" />
              Nuevo producto
            </button>
            <button
              onClick={() => navigate('/cargar')}
              className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold text-black transition-all"
              style={{ background: '#F59E0B' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FCD34D'}
              onMouseLeave={e => e.currentTarget.style.background = '#F59E0B'}
            >
              <Icon className="w-4 h-4" stroke={2.2} path="M12 16V4m0 0-4 4m4-4 4 4M5 20h14" />
              Cargar datos
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <ProductKpi
            label="Total productos"
            value={products.length}
            sub="Productos registrados"
            iconPath="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
            iconBg="rgba(34,211,238,0.12)"
            iconColor="#22D3EE"
          />
          <ProductKpi
            label="Ingresos totales"
            value={formatCurrency(summary.revenue)}
            sub="Ingresos generados"
            iconPath="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 1 1 0 7H6"
            iconBg="rgba(245,158,11,0.12)"
            iconColor="#F59E0B"
          />
          <ProductKpi
            label="Inversión total"
            value={formatCurrency(summary.investment)}
            sub="Inversión realizada"
            iconPath="M4 17 9 12l3 3 8-8M4 7h5v5"
            iconBg="rgba(167,139,250,0.12)"
            iconColor="#A78BFA"
          />
          <ProductKpi
            label="Ganancia neta"
            value={formatCurrency(summary.profit)}
            sub="Ganancia obtenida"
            iconPath="M4 19h16M5 15c2-4 5-6 7-6s4 1 7 6M12 9V4"
            iconBg="rgba(52,211,153,0.12)"
            iconColor="#34D399"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="rgba(255,255,255,0.30)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar producto..."
              className="w-full rounded-[10px] pl-10 pr-4 py-2.5 text-[13px] text-white focus:outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
              onFocus={e => e.target.style.borderColor = 'rgba(245,158,11,0.40)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
            />
          </div>
          {/* Category (visual only) */}
          <select
            className="rounded-[10px] px-4 py-2.5 text-[13px] text-white appearance-none focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 160 }}
          >
            <option>Todas las categorías</option>
          </select>
          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setPage(1) }}
            className="rounded-[10px] px-4 py-2.5 text-[13px] text-white appearance-none focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 180 }}
          >
            <option value="revenue">Ordenar por: Ingresos</option>
            <option value="investment">Ordenar por: Inversión</option>
            <option value="roas">Ordenar por: ROAS</option>
            <option value="profit">Ordenar por: Ganancia</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card overflow-hidden">
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-14 rounded-[10px]" />)}
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="card p-14 flex flex-col items-center gap-4 text-center">
            <div
              className="w-14 h-14 rounded-[20px] flex items-center justify-center"
              style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.18)', color: '#A78BFA' }}
            >
              <Icon className="w-7 h-7" path="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
            </div>
            <div>
              <p className="text-white font-semibold text-[17px]" style={{ letterSpacing: '-0.02em' }}>Aún no hay productos registrados</p>
              <p className="text-[13px] mt-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Comienza agregando tu primer producto o carga tus datos para ver el catálogo.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModal({})}
                className="inline-flex items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[13px] font-semibold"
                style={{ borderColor: 'rgba(167,139,250,0.30)', background: 'rgba(167,139,250,0.08)', color: '#A78BFA' }}
              >
                <Icon className="w-4 h-4" stroke={2} path="M12 5v14M5 12h14" />
                Nuevo producto
              </button>
              <button
                onClick={() => navigate('/cargar')}
                className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold text-black"
                style={{ background: '#F59E0B' }}
              >
                <Icon className="w-4 h-4" stroke={2} path="M12 16V4m0 0-4 4m4-4 4 4M5 20h14" />
                Cargar datos
              </button>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Table header */}
            <div
              className="hidden lg:grid px-5 py-3.5"
              style={{
                gridTemplateColumns: '48px minmax(0,1fr) 140px 130px 90px 130px 80px',
                gap: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {['#', 'PRODUCTO', 'INGRESOS ↓', 'INVERSIÓN', 'ROAS', 'GANANCIA', 'ACCIÓN'].map(col => (
                <span key={col} className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.28)' }}>{col}</span>
              ))}
            </div>

            {/* Rows */}
            {paginated.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Sin resultados para <span className="text-white">"{search}"</span>
                </p>
              </div>
            ) : (
              paginated.map((product, idx) => {
                const globalIdx = (page - 1) * pageSize + idx
                const roas   = product.total_investment > 0 ? product.total_revenue / product.total_investment : null
                const profit = (product.total_revenue ?? 0) - (product.total_investment ?? 0)

                return (
                  <div
                    key={product.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Desktop row */}
                    <div
                      className="hidden lg:grid items-center px-5 py-4"
                      style={{ gridTemplateColumns: '48px minmax(0,1fr) 140px 130px 90px 130px 80px', gap: '8px' }}
                    >
                      <span
                        className="text-[11px] font-bold px-1.5 py-0.5 rounded-[5px] w-fit"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.38)' }}
                      >
                        #{globalIdx + 1}
                      </span>
                      <button className="flex items-center gap-3 min-w-0 text-left" onClick={() => navigate(`/productos/${product.id}`)}>
                        <ProductAvatar name={product.name} index={globalIdx} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-white truncate">{product.name}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>{product.sales_count ?? 0} registros</p>
                        </div>
                      </button>
                      <p className="text-[13px] font-semibold tabular-nums" style={{ color: '#F59E0B' }}>{formatCurrency(product.total_revenue)}</p>
                      <p className="text-[13px] tabular-nums" style={{ color: 'rgba(255,255,255,0.55)' }}>{formatCurrency(product.total_investment)}</p>
                      <div>
                        {roas != null ? (
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-[5px]"
                            style={roas >= 3
                              ? { background: 'rgba(52,211,153,0.12)', color: '#34D399' }
                              : roas >= 1.5
                              ? { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }
                              : { background: 'rgba(248,113,113,0.12)', color: '#F87171' }
                            }
                          >
                            {roas.toFixed(2)}x
                          </span>
                        ) : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                      </div>
                      <p
                        className="text-[13px] font-semibold tabular-nums"
                        style={{ color: profit >= 0 ? '#34D399' : '#F87171' }}
                      >
                        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setModal({ product })}
                          className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all"
                          style={{ color: 'rgba(255,255,255,0.28)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#F4F4F6'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.28)'; e.currentTarget.style.background = 'transparent' }}
                        >
                          <Icon className="w-3.5 h-3.5" path="m16.86 4.49-.7-.7a2 2 0 0 0-2.83 0L4 13.12V17h3.88l9.33-9.33a2 2 0 0 0 0-2.83z" />
                        </button>
                        <button
                          onClick={() => navigate(`/productos/${product.id}`)}
                          className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-all"
                          style={{ color: 'rgba(255,255,255,0.28)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#F59E0B'; e.currentTarget.style.background = 'rgba(245,158,11,0.10)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.28)'; e.currentTarget.style.background = 'transparent' }}
                        >
                          <Icon className="w-3.5 h-3.5" path="m9 5 7 7-7 7" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="lg:hidden flex items-start gap-3 px-4 py-4">
                      <ProductAvatar name={product.name} index={globalIdx} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-white">{product.name}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{product.sales_count ?? 0} registros</p>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {[
                            { l: 'Ingresos',  v: formatCurrency(product.total_revenue),   c: '#F59E0B' },
                            { l: 'Inversión', v: formatCurrency(product.total_investment), c: 'rgba(255,255,255,0.55)' },
                            { l: 'Ganancia',  v: formatCurrency(profit),                   c: profit >= 0 ? '#34D399' : '#F87171' },
                          ].map(({ l, v, c }) => (
                            <div key={l}>
                              <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.28)' }}>{l}</p>
                              <p className="text-[12.5px] font-semibold mt-0.5 tabular-nums" style={{ color: c }}>{v}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => setModal({ product })} className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.30)' }}>
                          <Icon className="w-3.5 h-3.5" path="m16.86 4.49-.7-.7a2 2 0 0 0-2.83 0L4 13.12V17h3.88l9.33-9.33a2 2 0 0 0 0-2.83z" />
                        </button>
                        <button onClick={() => navigate(`/productos/${product.id}`)} className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ color: '#F59E0B' }}>
                          <Icon className="w-4 h-4" path="m9 5 7 7-7 7" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {/* Pagination footer */}
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Mostrando {sortedFiltered.length === 0 ? 0 : (page - 1) * pageSize + 1} a {Math.min(page * pageSize, sortedFiltered.length)} de {sortedFiltered.length} productos
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-[6px] flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
                >
                  <Icon className="w-3.5 h-3.5" path="m15 18-6-6 6-6" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[12px] font-semibold transition-all"
                    style={n === page
                      ? { background: '#F59E0B', color: '#000' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }
                    }
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 rounded-[6px] flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
                >
                  <Icon className="w-3.5 h-3.5" path="m9 18 6-6-6-6" />
                </button>
                <span className="text-[12px] ml-2" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  Registros por página: {pageSize}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ProductModal
          product={modal.product}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </Layout>
  )
}
