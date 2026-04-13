import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import Layout from '../components/Layout'
import DateRangePicker from '../components/DateRangePicker'
import { useDateRange } from '../context/DateRangeContext'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:3001/api'
function authHeaders() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const COLORS = ['#E8A020', '#3b82f6', '#10b981', '#a855f7', '#ef4444', '#f59e0b']

function fmt(n, prefix = '$') {
  if (n == null) return '—'
  return `${prefix}${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} ${months[parseInt(m)-1]}`
}

// ─── Tooltip personalizado ───────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs space-y-1 shadow-xl">
      <p className="text-[#a1a1aa] mb-1">{fmtDate(label) || label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[#a1a1aa]">{p.name}:</span>
          <span className="text-white font-medium">${Number(p.value).toLocaleString('es-AR', { minimumFractionDigits: 0 })}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Tab navigation ──────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-[10px] transition-all ${
        active
          ? 'bg-[#E8A020] text-black shadow-[0_2px_8px_rgba(232,160,32,0.3)]'
          : 'text-[#a1a1aa] hover:text-white hover:bg-[#1f1f23]'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Loading skeleton ────────────────────────────────────────────────────────
function Skeleton({ h = 'h-8', w = 'w-full' }) {
  return <div className={`${h} ${w} bg-[#1f1f23] rounded-[10px] animate-pulse`} />
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: COMPARADOR
// ══════════════════════════════════════════════════════════════════════════════
function ComparatorTab({ dateFrom, dateTo, products }) {
  const [selected, setSelected] = useState([])
  const [metric, setMetric] = useState('revenue')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(0, 4)
    )
  }

  const load = useCallback(async () => {
    if (selected.length < 2) { setData([]); return }
    setLoading(true)
    try {
      const r = await fetch(
        `${API}/insights/comparator?products=${selected.join(',')}&date_from=${dateFrom}&date_to=${dateTo}`,
        { headers: authHeaders() }
      )
      setData(await r.json())
    } finally { setLoading(false) }
  }, [selected, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const METRIC_LABELS = { revenue: 'Ingresos', investment: 'Inversión', profit: 'Ganancia' }

  // Merge series por fecha
  const chartData = (() => {
    if (!data.length) return []
    const map = {}
    data.forEach(prod => {
      prod.series.forEach(row => {
        if (!map[row.date]) map[row.date] = { date: row.date }
        map[row.date][prod.name] = row[metric]
      })
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  })()

  const winner = data.length
    ? data.reduce((best, p) => (!best || (p[metric] || 0) > (best[metric] || 0)) ? p : best, null)
    : null

  return (
    <div className="space-y-6">
      {/* Selector de productos */}
      <div className="card p-5">
        <p className="text-[#52525b] text-xs font-semibold tracking-widest uppercase mb-3">
          SELECCIONAR PRODUCTOS (máx. 4)
        </p>
        <div className="flex flex-wrap gap-2">
          {products.map((p, i) => {
            const active = selected.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  active
                    ? 'border-[#E8A020] text-[#E8A020] bg-[#E8A020]/10'
                    : 'border-[#2a2a2e] text-[#a1a1aa] hover:border-[#3a3a3e] hover:text-white'
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ background: active ? COLORS[selected.indexOf(p.id)] : '#52525b' }} />
                {p.name}
              </button>
            )
          })}
        </div>
        {selected.length < 2 && (
          <p className="text-[#52525b] text-xs mt-3">Seleccioná al menos 2 productos para comparar</p>
        )}
      </div>

      {selected.length >= 2 && (
        <>
          {/* Métrica toggle */}
          <div className="flex gap-2">
            {Object.entries(METRIC_LABELS).map(([key, label]) => (
              <TabBtn key={key} active={metric === key} onClick={() => setMetric(key)}>{label}</TabBtn>
            ))}
          </div>

          {/* Tabla KPIs comparativa */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2e]">
                    <th className="text-left text-[#52525b] text-xs font-semibold px-5 py-3">Producto</th>
                    <th className="text-right text-[#52525b] text-xs font-semibold px-4 py-3">Ingresos</th>
                    <th className="text-right text-[#52525b] text-xs font-semibold px-4 py-3">Inversión</th>
                    <th className="text-right text-[#52525b] text-xs font-semibold px-4 py-3">Ganancia</th>
                    <th className="text-right text-[#52525b] text-xs font-semibold px-4 py-3">ROAS</th>
                    <th className="text-right text-[#52525b] text-xs font-semibold px-4 py-3">Registros</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? [1,2,3].map(i => (
                        <tr key={i} className="border-b border-[#2a2a2e]">
                          {[1,2,3,4,5,6].map(j => (
                            <td key={j} className="px-4 py-3"><Skeleton h="h-4" /></td>
                          ))}
                        </tr>
                      ))
                    : data.map((p, i) => {
                        const isWinner = winner?.id === p.id
                        return (
                          <tr key={p.id} className="border-b border-[#2a2a2e] hover:bg-[#1f1f23] transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ background: COLORS[i] }} />
                                <span className="text-white font-medium">{p.name}</span>
                                {isWinner && (
                                  <span className="text-[10px] bg-[#E8A020]/20 text-[#E8A020] px-1.5 py-0.5 rounded-full font-semibold">
                                    🏆 mejor
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-right px-4 py-3 text-white">{fmt(p.revenue)}</td>
                            <td className="text-right px-4 py-3 text-[#a1a1aa]">{fmt(p.investment)}</td>
                            <td className={`text-right px-4 py-3 font-medium ${p.profit >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                              {fmt(p.profit)}
                            </td>
                            <td className="text-right px-4 py-3">
                              {p.roas != null ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  p.roas >= 3 ? 'bg-[#10b981]/20 text-[#10b981]'
                                  : p.roas >= 1.5 ? 'bg-[#E8A020]/20 text-[#E8A020]'
                                  : 'bg-[#ef4444]/20 text-[#ef4444]'
                                }`}>{p.roas}x</span>
                              ) : '—'}
                            </td>
                            <td className="text-right px-4 py-3 text-[#a1a1aa]">{p.records}</td>
                          </tr>
                        )
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráfico comparativo */}
          {!loading && chartData.length > 0 && (
            <div className="card p-5">
              <p className="text-white font-semibold mb-4">{METRIC_LABELS[metric]} por día</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#52525b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#52525b', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
                  {data.map((p, i) => (
                    <Line key={p.id} type="monotone" dataKey={p.name}
                      stroke={COLORS[i]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: CALCULADORA DE PRESUPUESTO
// ══════════════════════════════════════════════════════════════════════════════
function BudgetTab({ dateFrom, dateTo }) {
  const [target, setTarget] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(
        `${API}/insights/budget?target_revenue=${target}&date_from=${dateFrom}&date_to=${dateTo}`,
        { headers: authHeaders() }
      )
      setData(await r.json())
    } finally { setLoading(false) }
  }, [target, dateFrom, dateTo])

  useEffect(() => { load() }, [dateFrom, dateTo])

  const calc = async () => { await load() }

  const InvestCard = ({ label, value, color, sub }) => (
    <div className={`card p-4 border-l-2 ${color}`}>
      <p className="text-[#52525b] text-xs mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{fmt(value)}</p>
      {sub && <p className="text-[#52525b] text-xs mt-1">{sub}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* ROAS histórico */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-[#52525b] text-xs mb-1">ROAS promedio</p>
            <p className="text-2xl font-bold text-[#E8A020]">{data.avg_roas ?? '—'}x</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-[#52525b] text-xs mb-1">ROAS mínimo</p>
            <p className="text-2xl font-bold text-[#ef4444]">{data.min_roas ?? '—'}x</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-[#52525b] text-xs mb-1">ROAS máximo</p>
            <p className="text-2xl font-bold text-[#10b981]">{data.max_roas ?? '—'}x</p>
          </div>
        </div>
      )}

      {/* Input objetivo */}
      <div className="card p-5">
        <p className="text-white font-semibold mb-1">¿Cuánto querés facturar?</p>
        <p className="text-[#52525b] text-xs mb-4">Calculamos la inversión necesaria basándonos en tu historial de ROAS</p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] font-medium">$</span>
            <input
              type="number"
              placeholder="Ej: 100000"
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && calc()}
              className="w-full bg-[#0B0B0E] border border-[#2a2a2e] text-white pl-7 pr-3 py-2.5 rounded-[10px] focus:outline-none focus:border-[#E8A020]/60 transition-colors"
            />
          </div>
          <button
            onClick={calc}
            disabled={!target || loading}
            className="px-5 py-2.5 bg-[#E8A020] hover:bg-[#d4911c] text-black font-semibold rounded-[10px] transition-colors disabled:opacity-40"
          >
            Calcular
          </button>
        </div>
      </div>

      {/* Resultados */}
      {data && target && data.estimated_investment != null && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InvestCard
              label="Inversión estimada (ROAS promedio)"
              value={data.estimated_investment}
              color="border-l-[#E8A020]"
              sub={`Con ROAS ${data.avg_roas}x`}
            />
            <InvestCard
              label="Escenario optimista (ROAS máx)"
              value={data.optimistic_investment}
              color="border-l-[#10b981]"
              sub={`Con ROAS ${data.max_roas}x`}
            />
            <InvestCard
              label="Escenario conservador (ROAS mín)"
              value={data.conservative_investment}
              color="border-l-[#ef4444]"
              sub={data.min_roas > 0 ? `Con ROAS ${data.min_roas}x` : 'Datos insuficientes'}
            />
          </div>

          {/* Por producto */}
          {data.by_product?.length > 0 && (
            <div className="card p-5">
              <p className="text-white font-semibold mb-4">Inversión sugerida por producto</p>
              <div className="space-y-3">
                {data.by_product.map(p => {
                  const inv = parseFloat(target) / p.roas
                  const pct = (inv / (parseFloat(target) / data.avg_roas)) * 100
                  return (
                    <div key={p.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-white">{p.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#52525b]">ROAS {p.roas}x</span>
                          <span className="text-sm font-medium text-[#E8A020]">{fmt(inv)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#2a2a2e] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#E8A020] rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: PATRONES
// ══════════════════════════════════════════════════════════════════════════════
function PatternsTab({ dateFrom, dateTo }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/insights/patterns?date_from=${dateFrom}&date_to=${dateTo}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [dateFrom, dateTo])

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="card p-5"><Skeleton h="h-48" /></div>)}
    </div>
  )

  if (!data) return null

  const dowData = data.by_dow?.map(d => ({
    ...d,
    name: DOW_LABELS[d.dow] ?? `Día ${d.dow}`,
  })) ?? []

  const bestDow = dowData.reduce((best, d) => (!best || d.avg_roas > best.avg_roas) ? d : best, null)

  return (
    <div className="space-y-6">
      {/* Por día de semana */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-semibold">Rendimiento por día de la semana</p>
          {bestDow && (
            <span className="text-xs bg-[#10b981]/20 text-[#10b981] px-2.5 py-1 rounded-full font-medium">
              🏆 Mejor día: {bestDow.name} (ROAS {bestDow.avg_roas}x)
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dowData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fill: '#52525b', fontSize: 11 }}
              tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#52525b', fontSize: 11 }}
              tickFormatter={v => `${v}x`} />
            <Tooltip content={<ChartTooltip />} />
            <Bar yAxisId="left" dataKey="avg_revenue" name="Ingresos prom." fill="#E8A020" radius={[4,4,0,0]} />
            <Bar yAxisId="left" dataKey="avg_investment" name="Inversión prom." fill="#3b82f6" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* ROAS por día */}
        <div className="grid grid-cols-7 gap-1 mt-4">
          {dowData.map(d => (
            <div key={d.dow} className={`text-center p-2 rounded-[8px] ${
              d.avg_roas >= 3 ? 'bg-[#10b981]/10'
              : d.avg_roas >= 1.5 ? 'bg-[#E8A020]/10'
              : 'bg-[#ef4444]/10'
            }`}>
              <p className="text-[#52525b] text-[10px]">{d.name}</p>
              <p className={`text-sm font-bold mt-0.5 ${
                d.avg_roas >= 3 ? 'text-[#10b981]'
                : d.avg_roas >= 1.5 ? 'text-[#E8A020]'
                : 'text-[#ef4444]'
              }`}>{d.avg_roas ?? '—'}x</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rangos de inversión */}
      {data.investment_ranges?.length > 0 && (
        <div className="card p-5">
          <p className="text-white font-semibold mb-4">ROAS por rango de inversión</p>
          <div className="space-y-3">
            {data.investment_ranges.map((r, i) => {
              const best = data.investment_ranges.reduce((b, x) => x.avg_roas > b.avg_roas ? x : b)
              const isBest = r === best
              return (
                <div key={i} className={`flex items-center gap-4 p-3 rounded-[10px] ${
                  isBest ? 'bg-[#10b981]/10 border border-[#10b981]/20' : 'bg-[#1f1f23]'
                }`}>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{r.range}</p>
                    <p className="text-[#52525b] text-xs">{r.count} registros</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isBest && <span className="text-xs text-[#10b981]">🏆 Óptimo</span>}
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      r.avg_roas >= 3 ? 'bg-[#10b981]/20 text-[#10b981]'
                      : r.avg_roas >= 1.5 ? 'bg-[#E8A020]/20 text-[#E8A020]'
                      : 'bg-[#ef4444]/20 text-[#ef4444]'
                    }`}>{r.avg_roas}x</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mejores días */}
      {data.best_days?.length > 0 && (
        <div className="card p-5">
          <p className="text-white font-semibold mb-4">Top 5 días con mejor ROAS</p>
          <div className="space-y-2">
            {data.best_days.map((d, i) => (
              <div key={d.date} className="flex items-center gap-4 py-2 border-b border-[#2a2a2e] last:border-0">
                <span className="w-6 h-6 rounded-full bg-[#1f1f23] flex items-center justify-center text-xs text-[#52525b] font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-white text-sm flex-1">{fmtDate(d.date)} {d.date?.slice(0,4)}</span>
                <span className="text-[#a1a1aa] text-sm">{fmt(d.investment)} inv.</span>
                <span className="text-[#10b981] text-sm">{fmt(d.revenue)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  d.roas >= 3 ? 'bg-[#10b981]/20 text-[#10b981]'
                  : d.roas >= 1.5 ? 'bg-[#E8A020]/20 text-[#E8A020]'
                  : 'bg-[#ef4444]/20 text-[#ef4444]'
                }`}>{d.roas}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4: PROYECCIONES
// ══════════════════════════════════════════════════════════════════════════════
function ProjectionsTab({ dateFrom, dateTo, products }) {
  const [productId, setProductId] = useState('')
  const [days, setDays] = useState(7)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = `date_from=${dateFrom}&date_to=${dateTo}&days=${days}${productId ? `&product_id=${productId}` : ''}`
      const r = await fetch(`${API}/insights/projection?${qs}`, { headers: authHeaders() })
      setData(await r.json())
    } finally { setLoading(false) }
  }, [dateFrom, dateTo, days, productId])

  useEffect(() => { load() }, [load])

  const chartData = data
    ? [...(data.series || []), ...(data.projected || [])]
    : []

  const lastReal = data?.series?.slice(-1)[0]
  const firstProj = data?.projected?.[0]
  const projGrowth = lastReal && firstProj
    ? ((firstProj.revenue - lastReal.revenue) / Math.abs(lastReal.revenue || 1) * 100).toFixed(1)
    : null

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="card p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px] space-y-1.5">
            <label className="text-[#a1a1aa] text-xs font-medium">Producto</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="w-full bg-[#0B0B0E] border border-[#2a2a2e] text-white text-sm px-3 py-2.5 rounded-[10px] focus:outline-none focus:border-[#E8A020]/60"
            >
              <option value="">Todos los productos</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[#a1a1aa] text-xs font-medium">Días a proyectar</label>
            <div className="flex gap-1.5">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-2 text-sm rounded-[8px] font-medium transition-all ${
                    days === d
                      ? 'bg-[#E8A020] text-black'
                      : 'bg-[#1f1f23] text-[#a1a1aa] hover:text-white border border-[#2a2a2e]'
                  }`}
                >{d}d</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats proyección */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-[#52525b] text-xs mb-1">Días históricos</p>
            <p className="text-2xl font-bold text-white">{data.series?.length ?? 0}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-[#52525b] text-xs mb-1">Días proyectados</p>
            <p className="text-2xl font-bold text-[#E8A020]">{data.projected?.length ?? 0}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-[#52525b] text-xs mb-1">Ingreso proyectado (prom/día)</p>
            <p className="text-2xl font-bold text-[#10b981]">
              {data.projected?.length
                ? fmt(data.projected.reduce((a, p) => a + p.revenue, 0) / data.projected.length)
                : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Gráfico */}
      {loading ? (
        <div className="card p-5"><Skeleton h="h-64" /></div>
      ) : chartData.length > 0 ? (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-white font-semibold flex-1">Proyección de ingresos</p>
            <div className="flex items-center gap-4 text-xs text-[#a1a1aa]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#E8A020] inline-block" />
                Real
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-[#3b82f6] inline-block" />
                Proyección
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8A020" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#E8A020" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#52525b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#52525b', fontSize: 11 }}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone" dataKey="revenue" name="Ingresos"
                stroke="#E8A020" strokeWidth={2}
                fill="url(#projGrad)"
                strokeDasharray={(d) => d?.projected ? '5 3' : undefined}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[#52525b] text-xs mt-3 text-center">
            * La proyección se basa en el promedio móvil de los últimos 7 días del período seleccionado
          </p>
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-[#52525b] text-sm">No hay datos suficientes para proyectar</p>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'comparator',  label: '⚖️ Comparador' },
  { key: 'budget',      label: '💰 Presupuesto' },
  { key: 'patterns',   label: '📊 Patrones' },
  { key: 'projections', label: '📈 Proyecciones' },
]

export default function Insights() {
  const { dateFrom, dateTo } = useDateRange()
  const { user } = useAuth()
  const [tab, setTab] = useState('comparator')
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetch(`${API}/products`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setProducts(d.products ?? d ?? []))
      .catch(() => {})
  }, [])

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 lg:pb-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="font-display text-[26px] font-bold text-[#fafafa] tracking-tight leading-none">Inteligencia de Negocio</h1>
            <p className="text-[#52525b] text-[13px] mt-1.5">
              Análisis avanzado para tomar mejores decisiones
            </p>
          </div>
          <DateRangePicker />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(t => (
            <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </TabBtn>
          ))}
        </div>

        {/* Content */}
        <div className="animate-fade-up">
          {tab === 'comparator'  && <ComparatorTab  dateFrom={dateFrom} dateTo={dateTo} products={products} />}
          {tab === 'budget'      && <BudgetTab      dateFrom={dateFrom} dateTo={dateTo} />}
          {tab === 'patterns'    && <PatternsTab    dateFrom={dateFrom} dateTo={dateTo} />}
          {tab === 'projections' && <ProjectionsTab dateFrom={dateFrom} dateTo={dateTo} products={products} />}
        </div>
      </div>
    </Layout>
  )
}
