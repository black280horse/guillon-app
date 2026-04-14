import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import axios from 'axios'
import Layout from '../components/Layout'
import { usePeriod, PERIODS } from '../hooks/usePeriod'
import { useCountUp } from '../hooks/useCountUp'

/* ── Formato ─────────────────────────────────────────────────────────────────── */
const $fmt = n => `$${(n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtDate = str => { if (!str) return ''; const [,m,d] = str.split('-'); return `${d}/${m}` }
const fmtFull = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '—'

/* ── Tooltip ─────────────────────────────────────────────────────────────────── */
function ChartTip({ active, payload, label, prefix = '$' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-elevated px-4 py-3 shadow-2xl">
      <p className="text-[#a1a1aa] text-xs mb-2">{fmtDate(label)}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="text-xs font-semibold">
          {p.name}: {prefix === '$' ? $fmt(p.value) : `${(p.value ?? 0).toFixed(2)}x`}
        </p>
      ))}
    </div>
  )
}

/* ── KPI Card ────────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, color = 'text-white', prefix = '$', suffix = '', change, loading }) {
  const anim = useCountUp(loading ? 0 : (value ?? 0))
  const display = prefix === '$' ? $fmt(anim) : `${anim.toFixed(2)}${suffix}`

  if (loading) {
    return (
      <div className="card p-5 space-y-2">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-8 w-28 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
    )
  }

  const pct = parseFloat(change)
  const hasChange = change !== null && change !== undefined && !isNaN(pct)

  return (
    <div className="card p-5 space-y-1.5 hover:border-[#3a3a3e] transition-colors">
      <p className="text-[#a1a1aa] text-xs font-semibold uppercase tracking-wider">{label}</p>
      <p className={`text-[28px] font-light tabular-nums leading-none ${color}`} style={{ letterSpacing: '-0.03em' }}>{display}</p>
      {hasChange && (
        <p className={`text-xs font-semibold ${pct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
          {pct >= 0 ? '↑' : '↓'} {pct >= 0 ? '+' : ''}{pct.toFixed(1)}% vs anterior
        </p>
      )}
    </div>
  )
}

/* ── Gráfico mini ────────────────────────────────────────────────────────────── */
function MiniChart({ data, dataKey, color, name, prefix = '$', showRefLine }) {
  return (
    <div className="card p-4">
      <p className="text-[#a1a1aa] text-xs font-semibold mb-3">{name}</p>
      {!data?.length ? (
        <div className="h-32 flex items-center justify-center text-[#52525b] text-xs">Sin datos</div>
      ) : (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#2a2a2e" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={v => prefix === '$' ? `$${(v/1000).toFixed(0)}k` : `${v}x`}
                tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<ChartTip prefix={prefix} />} />
              {showRefLine && <ReferenceLine y={2} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} label={{ value: '2x', fill: '#f59e0b', fontSize: 9, position: 'right' }} />}
              <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ── Selector de período local ───────────────────────────────────────────────── */
function PeriodSelector(props) {
  const { period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo, selectedMonth, setSelectedMonth } = props
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIODS.map(p => (
        <button key={p.key} onClick={() => setPeriod(p.key)}
          className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${
            period === p.key ? 'bg-[#F59E0B] text-black' : 'bg-[#1f1f23] border border-[#2a2a2e] text-[#a1a1aa] hover:text-white hover:border-[#3a3a3e]'
          }`}>
          {p.label}
        </button>
      ))}
      {period === 'month' && (
        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="bg-[#1f1f23] border border-[#2a2a2e] text-white text-xs rounded-[8px] px-3 py-1.5 focus:outline-none focus:border-[#F59E0B]" />
      )}
      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            className="bg-[#1f1f23] border border-[#2a2a2e] text-white text-xs rounded-[8px] px-3 py-1.5 focus:outline-none focus:border-[#F59E0B]" />
          <span className="text-[#52525b] text-xs">→</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            className="bg-[#1f1f23] border border-[#2a2a2e] text-white text-xs rounded-[8px] px-3 py-1.5 focus:outline-none focus:border-[#F59E0B]" />
        </div>
      )}
    </div>
  )
}

/* ── Score de salud ──────────────────────────────────────────────────────────── */
function HealthScore({ kpis, sales }) {
  if (!kpis || !sales?.length) return null

  const roas = parseFloat(kpis.roas) || 0
  const roasScore = Math.min(roas / 4 * 40, 40) // 0-40

  const profitPct = kpis.total_revenue > 0 ? (kpis.net_profit / kpis.total_revenue) : 0
  const profitScore = Math.min(Math.max(profitPct * 100, 0), 30) // 0-30

  const consistency = sales.length >= 5 ? 30 : sales.length >= 2 ? 15 : 5
  const total = Math.round(roasScore + profitScore + consistency)

  const [color, label, desc] = total >= 70
    ? ['#10b981', 'Excelente', 'ROAS sólido, rentabilidad alta y datos consistentes.']
    : total >= 40
    ? ['#f59e0b', 'Regular', 'Hay margen de mejora en ROAS o rentabilidad.']
    : ['#ef4444', 'Crítico', 'ROAS bajo o datos insuficientes. Revisá la estrategia.']

  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (total / 100) * circumference

  return (
    <div className="card p-5 flex flex-col sm:flex-row items-center gap-5">
      {/* Ring */}
      <div className="relative shrink-0">
        <svg width="108" height="108" viewBox="0 0 108 108">
          <circle cx="54" cy="54" r={radius} fill="none" stroke="#2a2a2e" strokeWidth="8" />
          <circle cx="54" cy="54" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 54 54)"
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white leading-none">{total}</span>
          <span className="text-[#52525b] text-[10px]">/100</span>
        </div>
      </div>
      {/* Info */}
      <div>
        <p className="text-[#a1a1aa] text-xs font-semibold uppercase tracking-wider mb-1">Score de salud</p>
        <p className="text-xl font-bold" style={{ color }}>{label}</p>
        <p className="text-[#a1a1aa] text-sm mt-1 leading-relaxed max-w-xs">{desc}</p>
        <div className="flex gap-4 mt-3 text-xs text-[#52525b]">
          <span>ROAS: <b className="text-[#a1a1aa]">{roas.toFixed(2)}x</b></span>
          <span>Margen: <b className="text-[#a1a1aa]">{(profitPct * 100).toFixed(0)}%</b></span>
          <span>Registros: <b className="text-[#a1a1aa]">{sales.length}</b></span>
        </div>
      </div>
    </div>
  )
}

/* ── Análisis IA ─────────────────────────────────────────────────────────────── */
function AIAnalysisCard({ productId, kpis, dateFrom, dateTo }) {
  const [state, setState]   = useState('idle')
  const [result, setResult] = useState(null)

  const analyze = useCallback(async () => {
    setState('loading')
    try {
      const res = await axios.post('/api/ai/analyze', { product_id: productId, date_from: dateFrom, date_to: dateTo })
      if (res.data.error) { setState('error'); setResult(res.data.error); return }
      setState('done'); setResult(res.data)
    } catch { setState('error'); setResult('Error al conectar con la IA') }
  }, [productId, dateFrom, dateTo])

  return (
    <div className="card border-l-2 border-l-[#F59E0B] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-white font-semibold text-sm">Análisis inteligente</h3>
        </div>
        <button onClick={analyze} disabled={state === 'loading' || kpis?.total_records === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-semibold rounded-[8px] transition-all disabled:opacity-40">
          {state === 'loading'
            ? <><span className="w-3 h-3 border border-[#F59E0B] border-t-transparent rounded-[5px] animate-spin" />Analizando…</>
            : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Analizar con IA</>}
        </button>
      </div>

      {state === 'idle' && <p className="text-[#52525b] text-sm">Hacé clic para obtener recomendaciones basadas en los datos del período.</p>}
      {state === 'error' && <p className="text-[#ef4444] text-sm">{result}</p>}

      {state === 'done' && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {result.meta?.bestDay && (
              <div className="card-elevated p-3 text-center">
                <p className="text-[#52525b] text-xs mb-1">Mejor día</p>
                <p className="text-[#10b981] font-bold text-sm">{$fmt(result.meta.bestDay.revenue)}</p>
                <p className="text-[#52525b] text-xs">{fmtFull(result.meta.bestDay.date)}</p>
              </div>
            )}
            {result.meta?.worstDay && (
              <div className="card-elevated p-3 text-center">
                <p className="text-[#52525b] text-xs mb-1">Peor día</p>
                <p className="text-[#ef4444] font-bold text-sm">{$fmt(result.meta.worstDay.revenue)}</p>
                <p className="text-[#52525b] text-xs">{fmtFull(result.meta.worstDay.date)}</p>
              </div>
            )}
            {result.meta?.pctChange !== null && result.meta?.pctChange !== undefined && (
              <div className="card-elevated p-3 text-center">
                <p className="text-[#52525b] text-xs mb-1">vs anterior</p>
                <p className={`font-bold text-sm ${result.meta.pctChange >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {result.meta.pctChange >= 0 ? '+' : ''}{result.meta.pctChange}%
                </p>
              </div>
            )}
          </div>
          <div className="border-t border-[#2a2a2e] pt-4">
            <p className="text-[#a1a1aa] text-sm leading-relaxed whitespace-pre-line">{result.analysis}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Página principal ────────────────────────────────────────────────────────── */
export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const periodCtx = usePeriod()
  const { date_from, date_to } = periodCtx

  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    axios.get(`/api/products/${id}/detail?date_from=${date_from}&date_to=${date_to}`)
      .then(r => setData(r.data))
      .catch(() => navigate('/productos'))
      .finally(() => setLoading(false))
  }, [id, date_from, date_to])

  const product = data?.product
  const sales   = data?.sales ?? []
  const kpis    = data?.kpis
  const prevKpis = data?.prevKpis

  function pct(cur, prev) {
    if (!prev || prev === 0) return null
    return ((cur - prev) / prev) * 100
  }

  // vs anterior por día (para la columna de la tabla)
  const salesReversed = [...sales].reverse()
  const salesWithDelta = salesReversed.map((s, i) => {
    const prev = salesReversed[i + 1]
    const delta = prev && prev.revenue > 0 ? ((s.revenue - prev.revenue) / prev.revenue) * 100 : null
    return { ...s, delta }
  })

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-5 animate-fade-up">

        {/* Breadcrumb + header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-[#52525b]">
            <Link to="/dashboard" className="hover:text-[#a1a1aa] transition-colors">Dashboard</Link>
            <span>›</span>
            <Link to="/productos" className="hover:text-[#a1a1aa] transition-colors">Productos</Link>
            <span>›</span>
            <span className="text-[#a1a1aa]">{product?.name ?? '…'}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-[10px] card flex items-center justify-center text-[#a1a1aa] hover:text-white transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[22px] font-light text-white" style={{ letterSpacing: '-0.03em' }}>{product?.name ?? '…'}</h2>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-[5px] ${
                    sales.length > 0
                      ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20'
                      : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'
                  }`}>
                    {sales.length > 0 ? '🟢 Activo' : '🔴 Sin datos recientes'}
                  </span>
                </div>
                <p className="text-[#52525b] text-sm">{date_from} → {date_to}</p>
              </div>
            </div>
            <PeriodSelector {...periodCtx} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total vendido"   value={kpis?.total_revenue}   loading={loading} color="text-white"      change={pct(kpis?.total_revenue,   prevKpis?.total_revenue)} />
          <KpiCard label="Total invertido" value={kpis?.total_investment} loading={loading} color="text-[#ef4444]" change={pct(kpis?.total_investment, prevKpis?.total_investment)} />
          <KpiCard label="ROAS"            value={kpis?.roas}             loading={loading} color="text-[#F59E0B]"  prefix="" suffix="x" change={pct(kpis?.roas, prevKpis?.roas)} />
          <KpiCard label="Ganancia neta"   value={kpis?.net_profit}       loading={loading} color="text-[#10b981]" change={pct(kpis?.net_profit, prevKpis?.net_profit)} />
        </div>

        {/* Health score */}
        {!loading && <HealthScore kpis={kpis} sales={sales} />}

        {/* 3 gráficos */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="skeleton h-44 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MiniChart data={sales} dataKey="revenue"    color="#F59E0B" name="Ingresos diarios" />
            <MiniChart data={sales} dataKey="investment" color="#3b82f6" name="Inversión diaria" />
            <MiniChart data={sales} dataKey="roas"       color="#10b981" name="ROAS diario" prefix="x" showRefLine />
          </div>
        )}

        {/* Análisis IA */}
        {!loading && <AIAnalysisCard productId={id} kpis={kpis} dateFrom={date_from} dateTo={date_to} />}

        {/* Tabla día a día */}
        {sales.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2e] flex items-center justify-between">
              <h3 className="text-white font-semibold">Día a día</h3>
              <span className="text-[#52525b] text-xs">{sales.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2e] text-[#52525b]">
                    <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wider">Fecha</th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider">Ingresos</th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider">Inversión</th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider">Ganancia</th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider">ROAS</th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider">vs anterior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2e]">
                  {salesWithDelta.map((s, i) => (
                    <tr key={i} className="hover:bg-[#1f1f23] transition-colors">
                      <td className="px-5 py-3 text-[#a1a1aa] text-xs font-mono">{s.date}</td>
                      <td className="px-5 py-3 text-right text-white font-semibold">{$fmt(s.revenue)}</td>
                      <td className="px-5 py-3 text-right text-[#ef4444]">{$fmt(s.investment)}</td>
                      <td className={`px-5 py-3 text-right font-semibold ${(s.profit ?? 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                        {$fmt(s.profit)}
                      </td>
                      <td className="px-5 py-3 text-right text-[#F59E0B] font-semibold">
                        {s.roas ? `${parseFloat(s.roas).toFixed(2)}x` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {s.delta === null ? (
                          <span className="text-[#52525b] text-xs">—</span>
                        ) : (
                          <span className={`text-xs font-semibold ${s.delta >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {s.delta >= 0 ? '↑' : '↓'} {Math.abs(s.delta).toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#3a3a3e] bg-[#1f1f23]">
                    <td className="px-5 py-3 text-[#a1a1aa] font-bold text-xs uppercase">TOTAL</td>
                    <td className="px-5 py-3 text-right text-white font-bold">{$fmt(kpis?.total_revenue)}</td>
                    <td className="px-5 py-3 text-right text-[#ef4444] font-bold">{$fmt(kpis?.total_investment)}</td>
                    <td className={`px-5 py-3 text-right font-bold ${(kpis?.net_profit ?? 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {$fmt(kpis?.net_profit)}
                    </td>
                    <td className="px-5 py-3 text-right text-[#F59E0B] font-bold">
                      {kpis?.roas ? `${kpis.roas}x` : '—'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {!loading && sales.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-[#52525b] text-sm mb-3">No hay registros para el período seleccionado</p>
            <Link to="/cargar" className="text-[#F59E0B] text-sm hover:underline">Cargar datos →</Link>
          </div>
        )}
      </div>
    </Layout>
  )
}
