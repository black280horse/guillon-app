import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'
import { usePreferences } from '../context/PreferencesContext'

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
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${tone}`}>
      {roas}x ROAS
    </span>
  )
}

function SummaryKpi({ label, value, color, icon }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 ${color.bg}`}>
        <Icon className={`w-4 h-4 ${color.icon}`} path={icon} />
      </div>
      <div className="min-w-0">
        <p className="text-[#5a6d87] text-[10.5px] uppercase tracking-[0.2em]">{label}</p>
        <p className={`font-display text-[16px] font-bold leading-tight mt-0.5 ${color.text}`}>{value}</p>
      </div>
    </div>
  )
}

export default function Products() {
  const navigate = useNavigate()
  const { formatCurrency } = usePreferences()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  return (
    <Layout>
      <div className="space-y-5 max-w-[1480px] mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] md:text-[32px] font-bold text-white leading-none tracking-tight">
              Productos <span className="text-[#f5b641]">comerciales</span>
            </h1>
            <p className="text-[#5a6d87] text-[13px] mt-1">Catálogo, ingresos y rentabilidad por producto</p>
          </div>
          <button
            onClick={() => navigate('/cargar')}
            className="shrink-0 inline-flex items-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f5b641_0%,#ffcf73_100%)] px-4 py-2.5 text-[13px] font-semibold text-[#08111f] hover:brightness-110 transition-all"
          >
            <Icon className="w-4 h-4" stroke={2.2} path="M12 5v14M5 12h14" />
            Cargar dato
          </button>
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
              <p className="text-[#7d8ca5] text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">Carga tus primeras ventas para ver margen, ROAS y rendimiento por producto.</p>
            </div>
            <button
              onClick={() => navigate('/cargar')}
              className="inline-flex items-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f5b641_0%,#ffcf73_100%)] px-5 py-2.5 text-[#08111f] font-semibold text-sm"
            >
              <Icon className="w-4 h-4" stroke={2} path="M12 5v14M5 12h14" />
              Cargar primer dato
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-[#7d8ca5] text-sm">Sin resultados para <span className="text-white">"{search}"</span></p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Table header — desktop */}
            <div className="hidden lg:grid grid-cols-[40px_minmax(0,1fr)_140px_140px_100px_120px_44px] gap-4 px-4 pb-1">
              {['#', 'Producto', 'Ingresos', 'Inversión', 'ROAS', 'Ganancia', ''].map(col => (
                <span key={col} className="text-[10.5px] uppercase tracking-[0.2em] text-[#4f6278] font-semibold">{col}</span>
              ))}
            </div>

            {filtered.map((product, index) => {
              const roas = product.total_investment > 0
                ? parseFloat((product.total_revenue / product.total_investment).toFixed(2))
                : null
              const profit = (product.total_revenue ?? 0) - (product.total_investment ?? 0)
              const margin = product.total_revenue > 0
                ? ((profit / product.total_revenue) * 100).toFixed(0)
                : null

              return (
                <button
                  key={product.id}
                  onClick={() => navigate(`/productos/${product.id}`)}
                  className="w-full card p-4 text-left hover:border-[#4dd7ff]/18 hover:bg-white/[0.02] transition-all group"
                >
                  {/* Desktop row */}
                  <div className="hidden lg:grid grid-cols-[40px_minmax(0,1fr)_140px_140px_100px_120px_44px] gap-4 items-center">
                    <span className="text-[#4f6278] text-sm font-semibold">#{index + 1}</span>
                    <div className="min-w-0">
                      <p className="text-white text-[14px] font-semibold truncate">{product.name}</p>
                      <p className="text-[#5a6d87] text-[11px] mt-0.5">{product.sales_count} registros</p>
                    </div>
                    <p className="text-[#67dcff] text-[14px] font-semibold">{formatCurrency(product.total_revenue)}</p>
                    <p className="text-[#ffd27d] text-[14px]">{formatCurrency(product.total_investment)}</p>
                    <div>
                      {roas != null ? (
                        <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${roas >= 3 ? 'bg-[#22c55e]/10 text-[#63d68d]' : roas >= 1.5 ? 'bg-[#f5b641]/10 text-[#ffd27d]' : 'bg-[#fb7185]/10 text-[#ff9ca8]'}`}>
                          {roas}x
                        </span>
                      ) : (
                        <span className="text-[#4f6278] text-sm">—</span>
                      )}
                    </div>
                    <p className={`text-[14px] font-semibold ${profit >= 0 ? 'text-[#63d68d]' : 'text-[#ff9ca8]'}`}>
                      {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                    </p>
                    <div className="flex items-center justify-end">
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[#4f6278] group-hover:text-[#4dd7ff] group-hover:bg-[#4dd7ff]/8 transition-all">
                        <Icon className="w-4 h-4" path="m9 5 7 7-7 7" />
                      </div>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="lg:hidden flex items-start gap-3">
                    <div className="w-9 h-9 rounded-[12px] bg-white/[0.04] border border-white/8 flex items-center justify-center text-[#4f6278] text-[12px] font-bold shrink-0">
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
                    <Icon className="w-4 h-4 text-[#4f6278] shrink-0 mt-1" path="m9 5 7 7-7 7" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
