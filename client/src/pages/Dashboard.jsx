import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import axios from 'axios'
import Layout from '../components/Layout'
import DateRangePicker from '../components/DateRangePicker'
import { useDateRange } from '../context/DateRangeContext'
import { useCountUp } from '../hooks/useCountUp'
import { usePreferences } from '../context/PreferencesContext'

const SERIES_COLORS = {
  revenue: '#E8A020',
  investment: '#4F8CFF',
  profit: '#10B981',
  roas: '#8B5CF6',
}

const PIE_COLORS = ['#E8A020', '#4F8CFF', '#10B981', '#8B5CF6', '#FB7185']

function Icon({ path, className = 'w-4 h-4', stroke = 1.8 }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke} d={path} />
    </svg>
  )
}

function shortDate(iso) {
  if (!iso) return ''
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

function longDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
}

function numberValue(value) {
  return Number(value ?? 0)
}

function KpiSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton h-8 w-28 rounded" />
      <div className="skeleton h-10 w-full rounded-2xl" />
    </div>
  )
}

function MiniArea({ data, dataKey, color }) {
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`mini-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.28} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#mini-${dataKey})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function CompactKpi({ label, value, formatter, color, iconPath, change, chartData, chartKey, loading }) {
  const animated = useCountUp(loading ? 0 : numberValue(value))

  if (loading) return <KpiSkeleton />

  const delta = change !== null && change !== undefined && !Number.isNaN(parseFloat(change)) ? parseFloat(change) : null

  return (
    <div className="card p-4 h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[#7d8ca5] text-[11px] uppercase tracking-[0.18em]">{label}</p>
          <p className="font-display text-[30px] font-bold text-white mt-2 leading-none">
            <span style={{ color }}>{formatter(animated)}</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-[16px] bg-white/[0.04] border border-white/10 text-[#cfd9ea] flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5" path={iconPath} />
        </div>
      </div>

      <div className="mt-3">
        <MiniArea data={chartData} dataKey={chartKey} color={color} />
      </div>

      <div className={`text-[11px] font-semibold mt-2 ${delta === null ? 'text-[#7d8ca5]' : delta >= 0 ? 'text-[#10B981]' : 'text-[#FB7185]'}`}>
        {delta === null ? 'Sin comparativa' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`}
      </div>
    </div>
  )
}

function TrendTooltip({ active, payload, label, formatCurrency }) {
  if (!active || !payload?.length) return null

  return (
    <div className="card-elevated min-w-[200px] px-4 py-3">
      <p className="text-[#8ea0bc] text-xs mb-2">{longDate(label)}</p>
      {payload.map(item => (
        <div key={item.dataKey} className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            <span className="text-[#c0cee4] text-xs">{item.name}</span>
          </div>
          <span className="text-white text-xs font-semibold">
            {item.dataKey === 'roas' ? `${numberValue(item.value).toFixed(2)}x` : formatCurrency(item.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload, formatCurrency }) {
  if (!active || !payload?.length) return null
  const item = payload[0]

  return (
    <div className="card-elevated px-4 py-3">
      <p className="text-white text-sm font-semibold">{item.name}</p>
      <p className="text-[#8ea0bc] text-xs mt-1">{formatCurrency(item.value)}</p>
    </div>
  )
}

function RoasTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-elevated px-4 py-3">
      <p className="text-white text-sm font-semibold">{label}</p>
      <p className="text-[#8ea0bc] text-xs mt-1">{numberValue(payload[0].value).toFixed(2)}x</p>
    </div>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <h2 className="font-display text-[15px] font-bold text-white tracking-tight">{title}</h2>
      {action}
    </div>
  )
}

function ProductRankingCards({ products, formatCurrency, navigate }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 lg:hidden">
      {products.map((product, index) => (
        <button
          key={product.id}
          onClick={() => navigate(`/productos/${product.id}`)}
          className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-left hover:border-[#4dd7ff]/20 transition-all"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[#8ea0bc] text-[11px] uppercase tracking-[0.14em]">#{index + 1}</p>
              <p className="text-white text-sm font-semibold mt-1">{product.name}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${product.roas >= 3 ? 'bg-[#10B981]/14 text-[#7df3b8]' : product.roas >= 1.5 ? 'bg-[#E8A020]/14 text-[#ffd27d]' : 'bg-[#FB7185]/14 text-[#ffb7c5]'}`}>
              {product.roas ? `${numberValue(product.roas).toFixed(2)}x` : '-'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
            <div>
              <p className="text-[#7d8ca5]">Ingresos</p>
              <p className="text-white font-semibold mt-1">{formatCurrency(product.revenue)}</p>
            </div>
            <div>
              <p className="text-[#7d8ca5]">Inversion</p>
              <p className="text-[#c0cee4] font-semibold mt-1">{formatCurrency(product.investment)}</p>
            </div>
            <div>
              <p className="text-[#7d8ca5]">Ganancia</p>
              <p className={`font-semibold mt-1 ${numberValue(product.profit) >= 0 ? 'text-[#10B981]' : 'text-[#FB7185]'}`}>{formatCurrency(product.profit)}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function AIRecommendations({ summary, dateFrom, dateTo }) {
  const [state, setState] = useState('idle')
  const [insights, setInsights] = useState([])

  const generate = useCallback(async () => {
    setState('loading')
    const kpis = summary?.kpis
    const products = summary?.products ?? []
    const prompt = `Sos experto en marketing digital. Analiza estos datos (${dateFrom} a ${dateTo}) y genera exactamente 3 recomendaciones accionables en JSON. DATOS: Ingresos=${kpis?.total_revenue}, Inversion=${kpis?.total_investment}, ROAS=${kpis?.roas}, Ganancia=${kpis?.net_profit}. PRODUCTOS: ${products.slice(0, 5).map(p => `${p.name} rev=${p.revenue} roas=${p.roas ?? '-'}`).join(' | ')}. Formato exacto: [{"title":"titulo","body":"recomendacion corta"}]`

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.text) text += data.text
            } catch {}
          }
        }
      }

      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        setInsights(JSON.parse(match[0]).slice(0, 3))
        setState('done')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }, [summary, dateFrom, dateTo])

  if (state === 'idle') {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[#c0cee4] text-sm">Recomendaciones IA</p>
          <button onClick={generate} className="rounded-xl bg-[#E8A020] px-3 py-2 text-[11px] font-semibold text-black">
            Generar
          </button>
        </div>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="card p-4">
        <p className="text-[#c0cee4] text-sm">Generando recomendaciones...</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="card p-4">
        <p className="text-[#FB7185] text-sm">No se pudieron generar recomendaciones.</p>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <SectionHeader title="IA" />
      <div className="space-y-3">
        {insights.map((item, index) => (
          <div key={`${item.title}-${index}`} className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
            <p className="text-white text-sm font-semibold">{item.title}</p>
            <p className="text-[#8ea0bc] text-xs leading-relaxed mt-1">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { dateFrom, dateTo } = useDateRange()
  const { formatCurrency, formatNumber } = usePreferences()

  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sortCol, setSortCol] = useState('revenue')
  const [sortDir, setSortDir] = useState('desc')
  const [visibleSeries, setVisibleSeries] = useState({ revenue: true, investment: true, profit: true, roas: true })

  useEffect(() => {
    setLoading(true)
    axios.get(`/api/dashboard/summary?date_from=${dateFrom}&date_to=${dateTo}`)
      .then(response => setSummary(response.data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  const kpis = summary?.kpis
  const products = summary?.products ?? []
  const series = (summary?.daily_series ?? []).map(item => ({
    ...item,
    roas: item.investment > 0 ? item.revenue / item.investment : 0,
  }))
  const isEmpty = !loading && (!kpis || kpis.total_records === 0) && products.length === 0

  const sorted = [...products].sort((a, b) => {
    const left = numberValue(a[sortCol])
    const right = numberValue(b[sortCol])
    return sortDir === 'desc' ? right - left : left - right
  })

  const pieData = products.slice(0, 5).map(product => ({
    name: product.name,
    value: numberValue(product.revenue),
  }))

  const roasData = products.slice(0, 5).map(product => ({
    name: product.name,
    roas: numberValue(product.roas),
  }))

  const alerts = []
  if (!loading && products.length > 0) {
    const top = products[0]
    if (top) {
      alerts.push({
        tone: 'green',
        title: 'Top producto',
        body: `${top.name} lidera con ${formatCurrency(top.revenue)}.`,
        action: 'Ver',
        onAction: () => navigate(`/productos/${top.id}`),
      })
    }
    const risk = products.find(product => product.roas && numberValue(product.roas) < 1.5)
    if (risk) {
      alerts.push({
        tone: 'red',
        title: 'ROAS bajo',
        body: `${risk.name} esta debajo de 1.5x.`,
        action: 'Revisar',
        onAction: () => navigate(`/productos/${risk.id}`),
      })
    }
    if (kpis?.roas && numberValue(kpis.roas) > 3) {
      alerts.push({
        tone: 'blue',
        title: 'Escala posible',
        body: `ROAS promedio ${numberValue(kpis.roas).toFixed(2)}x.`,
      })
    }
  }

  function changePct(current, previous) {
    if (!previous || previous === 0) return null
    return ((current - previous) / previous) * 100
  }

  function toggleSort(column) {
    if (sortCol === column) setSortDir(current => current === 'desc' ? 'asc' : 'desc')
    else {
      setSortCol(column)
      setSortDir('desc')
    }
  }

  return (
    <Layout>
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-6 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] md:text-[32px] font-bold text-white leading-none tracking-tight">
              Dashboard <span className="text-[#f5b641]">comercial</span>
            </h1>
            <p className="text-[#5a6d87] text-[13px] mt-1">Visión consolidada del negocio</p>
          </div>
          <DateRangePicker />
        </div>

        {isEmpty ? (
          <div className="card p-10 text-center">
            <p className="text-white font-semibold text-lg">Sin datos</p>
            <p className="text-[#8ea0bc] text-sm mt-2">Carga ventas e inversion para activar el dashboard.</p>
            <Link to="/cargar" className="inline-flex items-center gap-2 mt-5 rounded-2xl bg-[#E8A020] px-5 py-3 text-sm font-semibold text-black">
              <Icon className="w-4 h-4" stroke={2} path="M12 5v14M5 12h14" />
              Cargar datos
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <CompactKpi label="Total vendido" value={kpis?.total_revenue} formatter={formatCurrency} color={SERIES_COLORS.revenue} iconPath="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 1 1 0 7H6" change={changePct(kpis?.total_revenue, kpis?.prev_revenue)} chartData={series} chartKey="revenue" loading={loading} />
              <CompactKpi label="Total invertido" value={kpis?.total_investment} formatter={formatCurrency} color={SERIES_COLORS.investment} iconPath="M4 17 9 12l3 3 8-8M4 7h5v5" change={changePct(kpis?.total_investment, kpis?.prev_investment)} chartData={series} chartKey="investment" loading={loading} />
              <CompactKpi label="ROAS" value={kpis?.roas} formatter={value => `${numberValue(value).toFixed(2)}x`} color={SERIES_COLORS.roas} iconPath="M4 19h16M6 15l4-4 3 3 5-6" change={changePct(kpis?.roas, kpis?.prev_roas)} chartData={series} chartKey="roas" loading={loading} />
              <CompactKpi label="Ganancia neta" value={kpis?.net_profit} formatter={formatCurrency} color={SERIES_COLORS.profit} iconPath="M4 19h16M5 15c2-4 5-6 7-6s4 1 7 6M12 9V4" change={changePct(kpis?.net_profit, kpis?.prev_profit)} chartData={series} chartKey="profit" loading={loading} />
            </div>

            <div className="card p-5">
              <SectionHeader
                title="Tendencia"
                action={
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'revenue', label: 'Ingresos', color: SERIES_COLORS.revenue },
                      { key: 'investment', label: 'Inversion', color: SERIES_COLORS.investment },
                      { key: 'profit', label: 'Ganancia', color: SERIES_COLORS.profit },
                      { key: 'roas', label: 'ROAS', color: SERIES_COLORS.roas },
                    ].map(item => (
                      <button
                        key={item.key}
                        onClick={() => setVisibleSeries(current => ({ ...current, [item.key]: !current[item.key] }))}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${visibleSeries[item.key] ? 'border-transparent text-black' : 'border-white/10 bg-white/[0.03] text-[#8ea0bc]'}`}
                        style={visibleSeries[item.key] ? { background: item.color } : {}}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                }
              />

              {loading ? (
                <div className="skeleton h-[360px] rounded-[24px]" />
              ) : (
                <div className="h-[360px] md:h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: '#7d8ca5', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#7d8ca5', fontSize: 12 }} axisLine={false} tickLine={false} width={72} tickFormatter={value => formatCurrency(value)} />
                      <Tooltip content={<TrendTooltip formatCurrency={formatCurrency} />} />
                      {visibleSeries.revenue && <Line type="monotone" dataKey="revenue" name="Ingresos" stroke={SERIES_COLORS.revenue} strokeWidth={3} dot={false} activeDot={{ r: 4 }} />}
                      {visibleSeries.investment && <Line type="monotone" dataKey="investment" name="Inversion" stroke={SERIES_COLORS.investment} strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />}
                      {visibleSeries.profit && <Line type="monotone" dataKey="profit" name="Ganancia" stroke={SERIES_COLORS.profit} strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />}
                      {visibleSeries.roas && <Line type="monotone" dataKey="roas" name="ROAS" stroke={SERIES_COLORS.roas} strokeWidth={2.2} strokeDasharray="6 5" dot={false} activeDot={{ r: 4 }} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
              <div className="space-y-5">
                <div className="card overflow-hidden">
                  <div className="px-5 py-5 border-b border-white/8 flex items-center justify-between gap-3">
                    <SectionHeader title="Ranking de productos" />
                    <span className="text-[#5a6d87] text-[11px] font-medium">{formatNumber(kpis?.total_records ?? 0)} registros</span>
                  </div>

                  {loading ? (
                    <div className="p-4 space-y-3">{[1, 2, 3].map(item => <div key={item} className="skeleton h-16 rounded-[18px]" />)}</div>
                  ) : (
                    <>
                      <ProductRankingCards products={sorted} formatCurrency={formatCurrency} navigate={navigate} />
                      <div className="hidden lg:block">
                        <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/8">
                            {[
                              { key: null, label: '#' },
                              { key: null, label: 'Producto' },
                              { key: 'revenue', label: 'Ingresos' },
                              { key: 'investment', label: 'Inversion' },
                              { key: 'roas', label: 'ROAS' },
                              { key: 'profit', label: 'Ganancia' },
                              { key: null, label: '' },
                            ].map(column => (
                              <th key={column.label} onClick={() => column.key && toggleSort(column.key)} className={`px-4 py-3 text-left text-[11px] uppercase tracking-[0.16em] text-[#7d8ca5] ${column.key ? 'cursor-pointer hover:text-white' : ''}`}>
                                {column.label}{column.key === sortCol && <span className="ml-1 text-[#E8A020]">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((product, index) => (
                            <tr key={product.id} className="border-b border-white/6 last:border-b-0 hover:bg-white/[0.03] transition-colors">
                              <td className="px-4 py-4 text-[#8ea0bc] text-sm font-semibold">#{index + 1}</td>
                              <td className="px-4 py-4">
                                <p className="text-white text-sm font-semibold">{product.name}</p>
                              </td>
                              <td className="px-4 py-4 text-sm font-semibold text-white">{formatCurrency(product.revenue)}</td>
                              <td className="px-4 py-4 text-sm text-[#c0cee4]">{formatCurrency(product.investment)}</td>
                              <td className="px-4 py-4">
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${product.roas >= 3 ? 'bg-[#10B981]/14 text-[#7df3b8]' : product.roas >= 1.5 ? 'bg-[#E8A020]/14 text-[#ffd27d]' : 'bg-[#FB7185]/14 text-[#ffb7c5]'}`}>
                                  {product.roas ? `${numberValue(product.roas).toFixed(2)}x` : '—'}
                                </span>
                              </td>
                              <td className={`px-4 py-4 text-sm font-semibold ${numberValue(product.profit) >= 0 ? 'text-[#10B981]' : 'text-[#FB7185]'}`}>
                                {formatCurrency(product.profit)}
                              </td>
                              <td className="px-4 py-4">
                                <button onClick={() => navigate(`/productos/${product.id}`)} className="text-[#E8A020] text-xs font-semibold hover:underline">
                                  Ver
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="card p-5">
                    <SectionHeader title="Distribución" />
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                            {pieData.map((item, index) => <Cell key={`${item.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<PieTooltip formatCurrency={formatCurrency} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card p-5">
                    <SectionHeader title="ROAS por producto" />
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={roasData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" horizontal={false} />
                          <XAxis type="number" tick={{ fill: '#7d8ca5', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={88} tick={{ fill: '#c0cee4', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<RoasTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                          <Bar dataKey="roas" radius={[0, 10, 10, 0]} fill="#8B5CF6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full xl:w-[320px] space-y-5 min-w-0">
                <div className="card p-5">
                  <SectionHeader title="Alertas" />
                  <div className="space-y-3">
                    {loading ? [1, 2].map(item => <div key={item} className="skeleton h-20 rounded-[18px]" />) : alerts.map((alert, index) => (
                      <div key={`${alert.title}-${index}`} className={`rounded-[18px] border p-3 ${alert.tone === 'green' ? 'border-[#10B981]/18 bg-[#10B981]/8' : alert.tone === 'red' ? 'border-[#FB7185]/18 bg-[#FB7185]/8' : 'border-[#4F8CFF]/18 bg-[#4F8CFF]/8'}`}>
                        <p className="text-white text-sm font-semibold">{alert.title}</p>
                        <p className="text-[#d7e0ef] text-xs mt-1">{alert.body}</p>
                        {alert.action && <button onClick={alert.onAction} className="text-[#E8A020] text-xs font-semibold mt-3 hover:underline">{alert.action}</button>}
                      </div>
                    ))}
                  </div>
                </div>

                {!loading && kpis?.total_records > 0 && (
                  <AIRecommendations summary={summary} dateFrom={dateFrom} dateTo={dateTo} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
