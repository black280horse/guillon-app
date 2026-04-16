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
  revenue:    '#F59E0B',
  investment: '#818CF8',
  profit:     '#34D399',
  roas:       '#A78BFA',
}

const PIE_COLORS = ['#F59E0B', '#34D399', '#818CF8', '#22D3EE', '#F87171']

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
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="skeleton h-2.5 w-20 rounded-full" />
          <div className="skeleton h-10 w-32 rounded-[8px]" />
        </div>
        <div className="skeleton w-11 h-11 rounded-[12px]" />
      </div>
      <div className="skeleton h-14 w-full rounded-[8px]" />
    </div>
  )
}

function MiniArea({ data, dataKey, color }) {
  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`mini-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#mini-${dataKey})`}
            dot={false}
          />
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
    <div className="card p-5 h-full flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'rgba(255,255,255,0.35)' }}>
            {label}
          </p>
          <p className="text-[34px] font-bold leading-none mt-2 tabular-nums"
            style={{ color, letterSpacing: '-0.04em' }}>
            {formatter(animated)}
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}28`, color }}
        >
          <Icon className="w-4 h-4" path={iconPath} />
        </div>
      </div>

      {/* Sparkline */}
      <MiniArea data={chartData} dataKey={chartKey} color={color} />

      {/* Delta badge */}
      {delta === null ? (
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.22)' }}>Sin comparativa</span>
      ) : (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[5px] w-fit"
          style={delta >= 0 ? { background: 'rgba(52,211,153,0.12)', color: '#34D399' } : { background: 'rgba(248,113,113,0.12)', color: '#F87171' }}
        >
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          <span className="font-normal opacity-60 ml-0.5">vs anterior</span>
        </span>
      )}
    </div>
  )
}

function ChartTooltipBox({ children }) {
  return (
    <div style={{
      background: 'rgba(18,18,28,0.97)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.60)',
      minWidth: '180px',
    }}>
      {children}
    </div>
  )
}

function TrendTooltip({ active, payload, label, formatCurrency }) {
  if (!active || !payload?.length) return null
  return (
    <ChartTooltipBox>
      <p className="text-[11px] font-medium mb-2.5" style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>
        {longDate(label)}
      </p>
      {payload.map(item => (
        <div key={item.dataKey} className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.70)' }}>{item.name}</span>
          </div>
          <span className="text-[13px] font-bold text-white tabular-nums">
            {item.dataKey === 'roas' ? `${numberValue(item.value).toFixed(2)}x` : formatCurrency(item.value)}
          </span>
        </div>
      ))}
    </ChartTooltipBox>
  )
}

function PieTooltip({ active, payload, formatCurrency }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <ChartTooltipBox>
      <p className="text-white text-[13px] font-bold">{item.name}</p>
      <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>{formatCurrency(item.value)}</p>
    </ChartTooltipBox>
  )
}

function RoasTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <ChartTooltipBox>
      <p className="text-white text-[13px] font-bold">{label}</p>
      <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>{numberValue(payload[0].value).toFixed(2)}x</p>
    </ChartTooltipBox>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <h2
        className="text-[14px] font-semibold text-white"
        style={{ letterSpacing: '-0.02em' }}
      >
        {title}
      </h2>
      {action}
    </div>
  )
}

function ProductRankingCards({ products, formatCurrency, navigate }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5 lg:hidden">
      {products.map((product, index) => (
        <button
          key={product.id}
          onClick={() => navigate(`/productos/${product.id}`)}
          className="rounded-[14px] p-4 text-left transition-all"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10.5px] font-bold tracking-[0.14em] uppercase" style={{ color: 'rgba(255,255,255,0.30)' }}>
                #{index + 1}
              </p>
              <p className="text-white text-[14px] font-semibold mt-1" style={{ letterSpacing: '-0.02em' }}>
                {product.name}
              </p>
            </div>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-[6px]"
              style={product.roas >= 3
                ? { background: 'rgba(52,211,153,0.12)', color: '#34D399' }
                : product.roas >= 1.5
                ? { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }
                : { background: 'rgba(248,113,113,0.12)', color: '#F87171' }
              }
            >
              {product.roas ? `${numberValue(product.roas).toFixed(2)}x` : '-'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Ingresos', val: formatCurrency(product.revenue), color: '#F59E0B' },
              { label: 'Inversión', val: formatCurrency(product.investment), color: 'rgba(255,255,255,0.55)' },
              { label: 'Ganancia', val: formatCurrency(product.profit), color: numberValue(product.profit) >= 0 ? '#34D399' : '#F87171' },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.28)' }}>{label}</p>
                <p className="text-[12.5px] font-bold mt-1 tabular-nums" style={{ color }}>{val}</p>
              </div>
            ))}
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
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.20)' }}
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="#A78BFA" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
              Recomendaciones IA
            </p>
            <p className="text-[11.5px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Generá insights accionables basados en tus datos del período.
            </p>
            <button
              onClick={generate}
              className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[12px] font-semibold text-black transition-all"
              style={{ background: '#F59E0B' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FCD34D'}
              onMouseLeave={e => e.currentTarget.style.background = '#F59E0B'}
            >
              Generar insights
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-[#A78BFA] border-t-transparent animate-spin" />
          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Generando recomendaciones…</p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="card p-5">
        <p className="text-[13px]" style={{ color: '#F87171' }}>No se pudieron generar recomendaciones.</p>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <SectionHeader title="Insights IA" />
      <div className="space-y-3">
        {insights.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            className="rounded-[12px] p-4"
            style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.14)' }}
          >
            <p className="text-white text-[13px] font-bold" style={{ letterSpacing: '-0.01em' }}>
              {item.title}
            </p>
            <p className="text-[12px] leading-relaxed mt-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {item.body}
            </p>
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
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      axios.get(`/api/dashboard/summary?date_from=${dateFrom}&date_to=${dateTo}`),
      axios.get('/api/tasks'),
    ])
      .then(([sr, tr]) => { setSummary(sr.data); setTasks(tr.data) })
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

  // ── Tasks Today
  const todayIso = new Date().toISOString().slice(0, 10)
  const tasksOverdue  = tasks.filter(t => t.status === 'overdue' && t.status !== 'completed')
  const tasksToday    = tasks.filter(t => t.due_date === todayIso && t.status !== 'completed' && t.status !== 'overdue')
  const tasksUpcoming = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed' || t.status === 'overdue') return false
    const diff = Math.ceil((new Date(t.due_date + 'T12:00:00') - new Date(new Date().toDateString())) / 86400000)
    return diff > 0 && diff <= 3
  })
  const hasTasksToday = tasksOverdue.length > 0 || tasksToday.length > 0 || tasksUpcoming.length > 0

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
      <div className="w-full space-y-6 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              className="text-[28px] font-semibold text-white leading-none"
              style={{ letterSpacing: '-0.04em' }}
            >
              Dashboard
            </h1>
            <p className="text-[12.5px] mt-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Visión consolidada del negocio
            </p>
          </div>
          <DateRangePicker />
        </div>

        {/* ── Tasks Today ─────────────────────────────────────────────────── */}
        {!loading && hasTasksToday && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold text-white" style={{ letterSpacing: '-0.01em' }}>Tareas hoy</h2>
              <Link to="/tareas" className="text-[11px] font-medium" style={{ color: '#F59E0B' }}>Ver todas →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Vencidas',  list: tasksOverdue.slice(0,4),  color: '#F87171', bg: 'rgba(248,113,113,0.07)', border: 'rgba(248,113,113,0.16)' },
                { label: 'Hoy',       list: tasksToday.slice(0,4),    color: '#F59E0B', bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.18)' },
                { label: 'Próximas',  list: tasksUpcoming.slice(0,4), color: '#818CF8', bg: 'rgba(129,140,248,0.07)', border: 'rgba(129,140,248,0.16)' },
              ].map(g => (
                <div key={g.label} className="rounded-[12px] p-3.5" style={{ background: g.bg, border: `1px solid ${g.border}` }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: g.color }}>{g.label}</span>
                    <span className="ml-auto text-[11px] font-bold tabular-nums" style={{ color: g.color }}>{g.list.length}</span>
                  </div>
                  {g.list.length === 0
                    ? <p className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Sin tareas</p>
                    : <div className="space-y-1.5">
                        {g.list.map(t => (
                          <div key={t.id} className="flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full mt-[7px] shrink-0" style={{ background: g.color }} />
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium leading-snug text-white truncate">{t.title}</p>
                              {t.product_name && <p className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.product_name}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {isEmpty ? (
          <div className="card p-14 text-center space-y-4">
            <div
              className="w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto"
              style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.18)', color: '#F59E0B' }}
            >
              <Icon className="w-8 h-8" path="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 1 1 0 7H6" />
            </div>
            <div>
              <p className="text-white font-bold text-[18px]" style={{ letterSpacing: '-0.02em' }}>Sin datos todavía</p>
              <p className="text-[13px] mt-1.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
                Cargá ventas e inversión para activar el dashboard.
              </p>
            </div>
            <Link
              to="/cargar"
              className="inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-[13px] font-semibold text-black"
              style={{ background: '#F59E0B' }}
            >
              <Icon className="w-4 h-4" stroke={2.2} path="M12 5v14M5 12h14" />
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

            <div className="card p-6">
              <SectionHeader
                title="Tendencia"
                action={
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'revenue',    label: 'Ingresos',  color: SERIES_COLORS.revenue },
                      { key: 'investment', label: 'Inversión', color: SERIES_COLORS.investment },
                      { key: 'profit',     label: 'Ganancia',  color: SERIES_COLORS.profit },
                      { key: 'roas',       label: 'ROAS',      color: SERIES_COLORS.roas },
                    ].map(item => (
                      <button
                        key={item.key}
                        onClick={() => setVisibleSeries(current => ({ ...current, [item.key]: !current[item.key] }))}
                        className="rounded-[8px] border px-3 py-1.5 text-[11px] font-semibold transition-all"
                        style={visibleSeries[item.key] ? {
                          background: `${item.color}18`,
                          color: item.color,
                          borderColor: `${item.color}35`,
                        } : {
                          background: 'transparent',
                          color: 'rgba(255,255,255,0.30)',
                          borderColor: 'rgba(255,255,255,0.08)',
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                }
              />

              {loading ? (
                <div className="skeleton h-[340px] rounded-[12px]" />
              ) : (
                <div className="h-[340px] md:h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                      <defs>
                        {Object.entries(SERIES_COLORS).map(([key, color]) => (
                          <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={color} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 6" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDate}
                        tick={{ fill: 'rgba(255,255,255,0.32)', fontSize: 11 }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(255,255,255,0.32)', fontSize: 11 }}
                        axisLine={false} tickLine={false}
                        width={72}
                        tickFormatter={value => formatCurrency(value)}
                      />
                      <Tooltip content={<TrendTooltip formatCurrency={formatCurrency} />} />
                      {visibleSeries.revenue    && <Area type="monotone" dataKey="revenue"    name="Ingresos"  stroke={SERIES_COLORS.revenue}    strokeWidth={2.5} fill={`url(#grad-revenue)`}    dot={false} activeDot={{ r: 4, fill: SERIES_COLORS.revenue }} />}
                      {visibleSeries.investment && <Area type="monotone" dataKey="investment" name="Inversión" stroke={SERIES_COLORS.investment} strokeWidth={2}   fill={`url(#grad-investment)`} dot={false} activeDot={{ r: 4, fill: SERIES_COLORS.investment }} />}
                      {visibleSeries.profit     && <Area type="monotone" dataKey="profit"     name="Ganancia"  stroke={SERIES_COLORS.profit}     strokeWidth={2}   fill={`url(#grad-profit)`}     dot={false} activeDot={{ r: 4, fill: SERIES_COLORS.profit }} />}
                      {visibleSeries.roas       && <Area type="monotone" dataKey="roas"       name="ROAS"      stroke={SERIES_COLORS.roas}       strokeWidth={2}   fill="none" strokeDasharray="5 4" dot={false} activeDot={{ r: 4, fill: SERIES_COLORS.roas }} />}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
              <div className="space-y-5">
                {/* Product ranking table */}
                <div className="card overflow-hidden">
                  <div className="px-6 py-5 flex items-center justify-between gap-3"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <h2 className="text-[14px] font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>
                      Ranking de productos
                    </h2>
                    <span
                      className="text-[11px] font-medium px-2.5 py-1 rounded-[6px]"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.40)' }}
                    >
                      {formatNumber(kpis?.total_records ?? 0)} reg.
                    </span>
                  </div>

                  {loading ? (
                    <div className="p-5 space-y-3">
                      {[1, 2, 3].map(item => <div key={item} className="skeleton h-14 rounded-[10px]" />)}
                    </div>
                  ) : (
                    <>
                      <ProductRankingCards products={sorted} formatCurrency={formatCurrency} navigate={navigate} />
                      <div className="hidden lg:block">
                        <table className="w-full">
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              {[
                                { key: null,         label: '#' },
                                { key: null,         label: 'Producto' },
                                { key: 'revenue',    label: 'Ingresos' },
                                { key: 'investment', label: 'Inversión' },
                                { key: 'roas',       label: 'ROAS' },
                                { key: 'profit',     label: 'Ganancia' },
                                { key: null,         label: '' },
                              ].map(column => (
                                <th
                                  key={column.label}
                                  onClick={() => column.key && toggleSort(column.key)}
                                  className={`px-5 py-3.5 text-left text-[10.5px] uppercase font-semibold tracking-[0.14em] ${column.key ? 'cursor-pointer' : ''}`}
                                  style={{ color: 'rgba(255,255,255,0.30)' }}
                                >
                                  {column.label}
                                  {column.key === sortCol && (
                                    <span className="ml-1" style={{ color: '#F59E0B' }}>
                                      {sortDir === 'desc' ? '↓' : '↑'}
                                    </span>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.map((product, index) => (
                              <tr
                                key={product.id}
                                className="group transition-colors"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <td className="px-5 py-4 text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                  {index + 1}
                                </td>
                                <td className="px-5 py-4">
                                  <p className="text-[13px] font-semibold text-white">{product.name}</p>
                                </td>
                                <td className="px-5 py-4 text-[13px] font-bold" style={{ color: '#F59E0B' }}>
                                  {formatCurrency(product.revenue)}
                                </td>
                                <td className="px-5 py-4 text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                  {formatCurrency(product.investment)}
                                </td>
                                <td className="px-5 py-4">
                                  <span
                                    className="text-[11px] font-bold px-2.5 py-1 rounded-[6px]"
                                    style={product.roas >= 3
                                      ? { background: 'rgba(52,211,153,0.12)', color: '#34D399' }
                                      : product.roas >= 1.5
                                      ? { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }
                                      : { background: 'rgba(248,113,113,0.12)', color: '#F87171' }
                                    }
                                  >
                                    {product.roas ? `${numberValue(product.roas).toFixed(2)}x` : '—'}
                                  </span>
                                </td>
                                <td
                                  className="px-5 py-4 text-[13px] font-bold"
                                  style={{ color: numberValue(product.profit) >= 0 ? '#34D399' : '#F87171' }}
                                >
                                  {formatCurrency(product.profit)}
                                </td>
                                <td className="px-5 py-4">
                                  <button
                                    onClick={() => navigate(`/productos/${product.id}`)}
                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-[6px] transition-all"
                                    style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.08)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.16)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.08)'}
                                  >
                                    Ver →
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

                {/* Charts row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="card p-6">
                    <SectionHeader title="Distribución de ingresos" />
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4} strokeWidth={0}>
                            {pieData.map((item, index) => (
                              <Cell key={`${item.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} opacity={0.90} />
                            ))}
                          </Pie>
                          <Tooltip content={<PieTooltip formatCurrency={formatCurrency} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card p-6">
                    <SectionHeader title="ROAS por producto" />
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={roasData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="roas-bar" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%"   stopColor="#818CF8" />
                              <stop offset="100%" stopColor="#A78BFA" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 6" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 11 }}
                            axisLine={false} tickLine={false}
                          />
                          <YAxis
                            type="category" dataKey="name" width={90}
                            tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                            axisLine={false} tickLine={false}
                          />
                          <Tooltip content={<RoasTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                          <Bar dataKey="roas" radius={[0, 8, 8, 0]} fill="url(#roas-bar)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <div className="w-full xl:w-[320px] space-y-5 min-w-0">
                {/* Alerts */}
                <div className="card p-6">
                  <SectionHeader title="Alertas" />
                  <div className="space-y-3">
                    {loading
                      ? [1, 2].map(item => <div key={item} className="skeleton h-20 rounded-[10px]" />)
                      : alerts.map((alert, index) => (
                        <div
                          key={`${alert.title}-${index}`}
                          className="rounded-[12px] p-4"
                          style={alert.tone === 'green'
                            ? { background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.16)' }
                            : alert.tone === 'red'
                            ? { background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.16)' }
                            : { background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.16)' }
                          }
                        >
                          <p className="text-white text-[13px] font-bold" style={{ letterSpacing: '-0.01em' }}>
                            {alert.title}
                          </p>
                          <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            {alert.body}
                          </p>
                          {alert.action && (
                            <button
                              onClick={alert.onAction}
                              className="text-[11px] font-bold mt-2.5 hover:underline"
                              style={{ color: '#F59E0B' }}
                            >
                              {alert.action} →
                            </button>
                          )}
                        </div>
                      ))
                    }
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
