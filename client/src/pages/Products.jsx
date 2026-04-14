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
      <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 ${color.bg}`}>
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
        className="relative w-full max-w-[440px] bg-[#131720] border border-white/[0.09] rounded-[12px] shadow-[0_32px_64px_rgba(0,0,0,0.65)] overflow-hidden"
        style={{ animation: 'modalIn 0.18s cubic-bezier(0.2,0,0,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.07]">
          <p className="text-[#8ea0bc] text-[11px] uppercase tracking-[0.16em] font-medium">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </p>
          <button onClick={onClose} className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[#52525b] hover:text-[#a1a1aa] hover:bg-white/[0.05] transition-all">
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
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[7px] px-3 py-2.5 text-[14px] text-white placeholder:text-[#4a4a56] focus:outline-none focus:border-white/[0.16] transition-colors"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.07] gap-3">
            <div>
              {isEdit && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[7px] text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/8 text-[12px] font-medium transition-all"
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
                    className="px-3 py-1.5 rounded-[6px] bg-[#ef4444]/15 text-[#ef4444] text-[12px] font-medium hover:bg-[#ef4444]/25 transition-all disabled:opacity-50"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-[6px] border border-white/[0.08] text-[#6b7280] text-[12px] font-medium hover:text-white transition-all"
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
                className="px-4 py-2 rounded-[7px] border border-white/[0.08] text-[#6b7280] hover:text-[#c0cee4] text-[12.5px] font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-[7px] bg-[#E8A020] text-black text-[12.5px] font-medium disabled:opacity-50 hover:bg-[#d4911c] transition-all"
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function Products() {
  const navigate = useNavigate()
  const { formatCurrency } = usePreferences()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | { product? }

  useEffect(() => {
    axios.get('/api/products').then(response => setProducts(response.data)).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => products.filter(product => product.name.toLowerCase().includes(search.toLowerCase())), [products, search])
  const summary = useMemo(() => {
    const revenue = products.reduce((acc, item) => acc + (item.total_revenue ?? 0), 0)
    const investment = products.reduce((acc, item) => acc + (item.total_investment ?? 0), 0)
    const profit = revenue - investment
    const best = [...products].sort((a, b) => (b.total_revenue ?? 0) - (a.total_revenue ?? 0))[0]
    return { revenue, investment, profit, best }
  }, [products])

  function handleSaved(product, mode) {
    if (mode === 'create') {
      setProducts(ps => [...ps, { ...product, total_revenue: 0, total_investment: 0, sales_count: 0 }])
    } else {
      setProducts(ps => ps.map(p => p.id === product.id ? { ...p, name: product.name } : p))
    }
  }

  function handleDeleted(id) {
    setProducts(ps => ps.filter(p => p.id !== id))
  }

  return (
    <Layout>
      <div className="space-y-5 max-w-[1480px] mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-light text-white leading-none" style={{ letterSpacing: '-0.04em' }}>
              Productos <span style={{ color: '#E8A020', fontWeight: 400 }}>comerciales</span>
            </h1>
            <p className="text-[#5a6d87] text-[13px] mt-1">Catálogo, ingresos y rentabilidad por producto</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setModal({})}
              className="inline-flex items-center gap-2 rounded-[6px] border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.07] px-4 py-2 text-[13px] font-medium text-[#c0cee4] transition-all"
            >
              <Icon className="w-4 h-4" stroke={2.2} path="M12 5v14M5 12h14" />
              Nuevo producto
            </button>
            <button
              onClick={() => navigate('/cargar')}
              className="inline-flex items-center gap-2 rounded-[6px] bg-[#E8A020] hover:bg-[#f5b33a] px-4 py-2 text-[13px] font-medium text-[#07111f] transition-all"
            >
              <Icon className="w-4 h-4" stroke={2.2} path="M12 5v14M5 12h14" />
              Cargar dato
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="card p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-white/[0.06]">
            <SummaryKpi
              label="Productos"
              value={products.length}
              color={{ bg: 'bg-[#4dd7ff]/10', icon: 'text-[#4dd7ff]', text: 'text-white' }}
              icon="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
            />
            <div className="pl-4">
              <SummaryKpi
                label="Ingresos"
                value={formatCurrency(summary.revenue)}
                color={{ bg: 'bg-[#f5b641]/10', icon: 'text-[#f5b641]', text: 'text-[#67dcff]' }}
                icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 1 1 0 7H6"
              />
            </div>
            <div className="pl-4">
              <SummaryKpi
                label="Inversión"
                value={formatCurrency(summary.investment)}
                color={{ bg: 'bg-[#8c7cff]/10', icon: 'text-[#8c7cff]', text: 'text-[#ffd27d]' }}
                icon="M4 17 9 12l3 3 8-8M4 7h5v5"
              />
            </div>
            <div className="pl-4">
              <SummaryKpi
                label="Ganancia neta"
                value={formatCurrency(summary.profit)}
                color={{ bg: 'bg-[#22c55e]/10', icon: 'text-[#22c55e]', text: summary.profit >= 0 ? 'text-[#63d68d]' : 'text-[#ff9ca8]' }}
                icon="M4 19h16M5 15c2-4 5-6 7-6s4 1 7 6M12 9V4"
              />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6d87]" path="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar producto..."
            className="w-full rounded-[14px] bg-white/[0.04] border border-white/[0.08] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#5a6d87] focus:outline-none focus:border-[#4dd7ff]/22 transition-colors"
          />
        </div>

        {/* Product list */}
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map(item => <div key={item} className="skeleton h-[76px] rounded-[20px]" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="card p-14 text-center space-y-4">
            <div className="w-14 h-14 rounded-[22px] bg-[linear-gradient(135deg,rgba(245,182,65,0.16),rgba(77,215,255,0.08))] border border-[#f5b641]/16 flex items-center justify-center mx-auto text-[#ffd27d]">
              <Icon className="w-7 h-7" path="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v18m8-13.5l-8 4.5-8-4.5" />
            </div>
            <div>
              <p className="text-white font-semibold text-[17px]">Todavía no tienes productos</p>
              <p className="text-[#7d8ca5] text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">Crea un producto o carga tus primeras ventas para ver margen, ROAS y rendimiento.</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setModal({})}
                className="inline-flex items-center gap-2 rounded-[6px] border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.07] px-4 py-2.5 text-[#c0cee4] font-medium text-sm"
              >
                <Icon className="w-4 h-4" stroke={2} path="M12 5v14M5 12h14" />
                Nuevo producto
              </button>
              <button
                onClick={() => navigate('/cargar')}
                className="inline-flex items-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f5b641_0%,#ffcf73_100%)] px-5 py-2.5 text-[#08111f] font-semibold text-sm"
              >
                <Icon className="w-4 h-4" stroke={2} path="M12 5v14M5 12h14" />
                Cargar primer dato
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-[#7d8ca5] text-sm">Sin resultados para <span className="text-white">"{search}"</span></p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Table header — desktop */}
            <div className="hidden lg:grid grid-cols-[40px_minmax(0,1fr)_140px_140px_100px_120px_88px] gap-4 px-4 pb-1">
              {['#', 'Producto', 'Ingresos', 'Inversión', 'ROAS', 'Ganancia', ''].map(col => (
                <span key={col} className="text-[10.5px] uppercase tracking-[0.2em] text-[#4f6278] font-semibold">{col}</span>
              ))}
            </div>

            {filtered.map((product, index) => {
              const roas = product.total_investment > 0
                ? parseFloat((product.total_revenue / product.total_investment).toFixed(2))
                : null
              const profit = (product.total_revenue ?? 0) - (product.total_investment ?? 0)

              return (
                <div
                  key={product.id}
                  className="card p-4 hover:border-[#4dd7ff]/18 hover:bg-white/[0.02] transition-all group"
                >
                  {/* Desktop row */}
                  <div className="hidden lg:grid grid-cols-[40px_minmax(0,1fr)_140px_140px_100px_120px_88px] gap-4 items-center">
                    <span className="text-[#4f6278] text-sm font-semibold">#{index + 1}</span>
                    <button
                      className="min-w-0 text-left"
                      onClick={() => navigate(`/productos/${product.id}`)}
                    >
                      <p className="text-white text-[14px] font-semibold truncate group-hover:text-[#4dd7ff] transition-colors">{product.name}</p>
                      <p className="text-[#5a6d87] text-[11px] mt-0.5">{product.sales_count} registros</p>
                    </button>
                    <p className="text-[#67dcff] text-[14px] font-semibold">{formatCurrency(product.total_revenue)}</p>
                    <p className="text-[#ffd27d] text-[14px]">{formatCurrency(product.total_investment)}</p>
                    <div>
                      {roas != null ? (
                        <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-[5px] ${roas >= 3 ? 'bg-[#22c55e]/10 text-[#63d68d]' : roas >= 1.5 ? 'bg-[#f5b641]/10 text-[#ffd27d]' : 'bg-[#fb7185]/10 text-[#ff9ca8]'}`}>
                          {roas}x
                        </span>
                      ) : (
                        <span className="text-[#4f6278] text-sm">—</span>
                      )}
                    </div>
                    <p className={`text-[14px] font-semibold ${profit >= 0 ? 'text-[#63d68d]' : 'text-[#ff9ca8]'}`}>
                      {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                    </p>
                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setModal({ product })}
                        title="Editar"
                        className="w-8 h-8 rounded-[7px] flex items-center justify-center text-[#4f6278] hover:text-[#a1a1aa] hover:bg-white/[0.06] transition-all"
                      >
                        <Icon className="w-3.5 h-3.5" path="m16.86 4.49-.7-.7a2 2 0 0 0-2.83 0L4 13.12V17h3.88l9.33-9.33a2 2 0 0 0 0-2.83z" />
                      </button>
                      <button
                        onClick={() => navigate(`/productos/${product.id}`)}
                        title="Ver detalle"
                        className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[#4f6278] hover:text-[#4dd7ff] hover:bg-[#4dd7ff]/8 transition-all"
                      >
                        <Icon className="w-4 h-4" path="m9 5 7 7-7 7" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="lg:hidden flex items-start gap-3">
                    <div className="w-9 h-9 rounded-[6px] bg-white/[0.04] border border-white/8 flex items-center justify-center text-[#4f6278] text-[12px] font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-[14px] font-semibold">{product.name}</p>
                        <RoasBadge roas={roas} />
                      </div>
                      <p className="text-[#5a6d87] text-[11px] mt-0.5">{product.sales_count} registros</p>
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                          <p className="text-[#5a6d87] text-[10px] uppercase tracking-[0.14em]">Ingresos</p>
                          <p className="text-[#67dcff] text-[13px] font-semibold mt-1">{formatCurrency(product.total_revenue)}</p>
                        </div>
                        <div>
                          <p className="text-[#5a6d87] text-[10px] uppercase tracking-[0.14em]">Inversión</p>
                          <p className="text-[#ffd27d] text-[13px] font-semibold mt-1">{formatCurrency(product.total_investment)}</p>
                        </div>
                        <div>
                          <p className="text-[#5a6d87] text-[10px] uppercase tracking-[0.14em]">Ganancia</p>
                          <p className={`text-[13px] font-semibold mt-1 ${profit >= 0 ? 'text-[#63d68d]' : 'text-[#ff9ca8]'}`}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => setModal({ product })} className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#4f6278] hover:text-[#a1a1aa] hover:bg-white/[0.06] transition-all">
                        <Icon className="w-3.5 h-3.5" path="m16.86 4.49-.7-.7a2 2 0 0 0-2.83 0L4 13.12V17h3.88l9.33-9.33a2 2 0 0 0 0-2.83z" />
                      </button>
                      <button onClick={() => navigate(`/productos/${product.id}`)} className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#4f6278] hover:text-[#4dd7ff] hover:bg-[#4dd7ff]/8 transition-all">
                        <Icon className="w-4 h-4" path="m9 5 7 7-7 7" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
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
