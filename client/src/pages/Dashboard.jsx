import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
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

const PERIODS = [
  { key: '7d',         label: '7D' },
  { key: 'this_month', label: 'Mes' },
  { key: '3m',         label: '3M' },
  { key: 'this_year',  label: 'Año' },
  { key: 'all',        label: 'Todo' },
]

function shortDate(iso) {
  if (!iso) return ''
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

function longDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function n(value) { return Number(value ?? 0) }

// ── Pure SVG sparkline ────────────────────────────────────
function MiniSpark({ data, dataKey, color, height = 42 }) {
  if (!data?.length || data.length < 2) return <div style={{ height }} />
  const vals = data.map(d => n(d[dataKey]))
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const W = 120, H = height
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 6) - 3
    return `${x},${y}`
  })
  const line = `M ${pts.join(' L ')}`
  const area = `${line} L ${W},${H} L 0,${H} Z`
  const gid = `sg-${dataKey}`
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.30} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ── Period tabs ───────────────────────────────────────────
function PeriodTabs({ activeKey, onSelect }) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-[10px] p-1"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {PERIODS.map(p => (
        <button
          key={p.key}
          onClick={() => onSelect(p.key)}
          className="rounded-[7px] px-3 py-1.5 text-[11.5px] font-semibold transition-all"
          style={activeKey === p.key ? {
            background: 'rgba(255,255,255,0.09)',
            color: '#F4F4F6',
          } : {
            background: 'transparent',
            color: 'rgba(255,255,255,0.38)',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="skeleton h-2.5 w-20 rounded-full" />
          <div className="skeleton h-8 w-28 rounded-[6px]" />
        </div>
        <div className="skeleton w-[34px] h-[34px] rounded-[8px]" />
      </div>
      <div className="skeleton h-[42px] w-full rounded-[6px]" />
      <div className="skeleton h-4 w-24 rounded-full" />
    </div>
  )
}

function KpiCard({ label, value, formatter, color, iconPath, change, chartData, chartKey, loading }) {
  const animated = useCountUp(loading ? 0 : n(value))
  if (loading) return <KpiSkeleton />
  const delta = change !== null && change !== undefined && !Number.isNaN(parseFloat(change)) ? parseFloat(change) : null
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {label}
          </p>
          <p className="text-[30px] font-bold leading-[1.1] mt-2 tabular-nums truncate" style={{ color, letterSpacing: '-0.04em' }}>
            {formatter(animated)}
          </p>
        </div>
        <div
          className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}25`, color }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={iconPath} />
          </svg>
        </div>
      </div>

      <MiniSpark data={chartData} dataKey={chartKey} color={color} height={42} />

      {delta === null ? (
        <span className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.22)' }}>Sin comparativa</span>
      ) : (
        <span
          className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-[5px] w-fit"
          style={delta >= 0 ? { background: 'rgba(52,211,153,0.12)', color: '#34D399' } : { background: 'rgba(248,113,113,0.12)', color: '#F87171' }}
        >
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          <span className="font-normal opacity-60 ml-0.5">vs anterior</span>
        </span>
      )}
    </div>
  )
}

// ── Tooltip helpers ───────────────────────────────────────
function TooltipBox({ children }) {
  return (
    <div style={{ background: 'rgba(18,18,28,0.97)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '12px 16px', boxShadow: '0 12px 40px rgba(0,0,0,0.60)', minWidth: 180 }}>
      {children}
    </div>
  )
}

function TrendTooltip({ active, payload, label, formatCurrency }) {
  if (!active || !payload?.length) return null
  return (
    <TooltipBox>
      <p className="text-[11px] font-medium mb-2.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{longDate(label)}</p>
      {payload.map(item => (
        <div key={item.dataKey} className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.70)' }}>{item.name}</span>
          </div>
          <span className="text-[13px] font-bold text-white tabular-nums">
            {item.dataKey === 'roas' ? `${n(item.value).toFixed(2)}x` : formatCurrency(item.value)}
          </span>
        </div>
      ))}
    </TooltipBox>
  )
}

function PieTooltip({ active, payload, formatCurrency }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <TooltipBox>
      <p className="text-white text-[13px] font-bold">{item.name}</p>
      <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>{formatCurrency(item.value)}</p>
    </TooltipBox>
  )
}

function RoasTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <TooltipBox>
      <p className="text-white text-[13px] font-bold">{label}</p>
      <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>{n(payload[0].value).toFixed(2)}x</p>
    </TooltipBox>
  )
}

// ── Tasks overview chips ──────────────────────────────────
function TasksOverview({ overdue, pending, inProgress, completed, navigate }) {
  const chips = [
    { label: 'Vencidas',   count: overdue,     color: '#F87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.20)', icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
    { label: 'Pendientes', count: pending,     color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.20)',  icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2' },
    { label: 'En curso',   count: inProgress,  color: '#818CF8', bg: 'rgba(129,140,248,0.10)', border: 'rgba(129,140,248,0.20)', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Completadas',count: completed,   color: '#34D399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.20)',  icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  ]
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-white" style={{ letterSpacing: '-0.01em' }}>Tareas</p>
        <Link to="/tareas" className="text-[11px] font-medium" style={{ color: '#F59E0B' }}>Ver tablero →</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map(chip => (
          <button
            key={chip.label}
            onClick={() => navigate('/tareas')}
            className="inline-flex items-center gap-2 rounded-[8px] px-3 py-2 transition-all"
            style={{ background: chip.bg, border: `1px solid ${chip.border}` }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.80'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke={chip.color} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={chip.icon} />
            </svg>
            <span className="text-[11.5px] font-semibold tabular-nums" style={{ color: chip.color }}>{chip.count}</span>
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── AI Recommendations ────────────────────────────────────
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
            try { const data = JSON.parse(line.slice(6)); if (data.text) text += data.text } catch {}
          }
        }
      }
      const match = text.match(/\[[\s\S]*\]/)
      if (match) { setInsights(JSON.parse(match[0]).slice(0, 3)); setState('done') }
      else setState('error')
    } catch { setState('error') }
  }, [summary, dateFrom, dateTo])

  if (state === 'idle') {
    return (
      <div
        className="card p-5"
        style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(129,140,248,0.05) 100%)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
            <svg className="w-4 h-4" fill="none" stroke="#A78BFA" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold" style={{ letterSpacing: '-0.01em' }}>Recomendaciones IA</p>
            <p className="text-[11.5px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Insights accionables basados en tus datos del período.
            </p>
            <button
              onClick={generate}
              className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13px] font-semibold text-black transition-all"
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
    <div
      className="card p-6"
      style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(129,140,248,0.04) 50%, rgba(34,211,238,0.04) 100%)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="#A78BFA" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h2 className="text-[13px] font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>Insights IA</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {insights.map((item, index) => (
          <div key={`${item.title}-${index}`} className="rounded-[12px] p-4" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.16)' }}>
            <p className="text-white text-[12.5px] font-bold" style={{ letterSpacing: '-0.01em' }}>{item.title}</p>
            <p className="text-[11.5px] leading-relaxed mt-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { dateFrom, dateTo, applyPreset } = useDateRange()
  const { formatCurrency, formatNumber } = usePreferences()

  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sortCol, setSortCol] = useState('revenue')
  const [sortDir, setSortDir] = useState('desc')
  const [visibleSeries, setVisibleSeries] = useState({ revenue: true, investment: true, profit: true, roas: true })
  const [tasks, setTasks] = useState([])
  const [activeKey, setActiveKey] = useState('30d')

  function handlePeriod(key) {
    setActiveKey(key)
    applyPreset(key)
  }

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
    const left = n(a[sortCol])
    const right = n(b[sortCol])
    return sortDir === 'desc' ? right - left : left - right
  })

  const pieData = products.slice(0, 5).map(p => ({ name: p.name, value: n(p.revenue) }))
  const roasData = products.slice(0, 5).map(p => ({ name: p.name, roas: n(p.roas) }))

  const taskCounts = {
    overdue:    tasks.filter(t => t.status === 'overdue').length,
    pending:    tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed:  tasks.filter(t => t.status === 'done').length,
  }
  const hasTasks = tasks.length > 0

  const alerts = []
  if (!loading && products.length > 0) {
    const top = products[0]
    if (top) alerts.push({ tone: 'green', title: 'Top producto', body: `${top.name} lidera con ${formatCurrency(top.revenue)}.`, action: 'Ver', onAction: () => navigate(`/productos/${top.id}`) })
    const risk = products.find(p => p.roas && n(p.roas) < 1.5)
    if (risk) alerts.push({ tone: 'red', title: 'ROAS bajo', body: `${risk.name} debajo de 1.5x.`, action: 'Revisar', onAction: () => navigate(`/productos/${risk.id}`) })
    if (kpis?.roas && n(kpis.roas) > 3) alerts.push({ tone: 'blue', title: 'Escala posible', body: `ROAS promedio ${n(kpis.roas).toFixed(2)}x.` })
  }

  function changePct(current, previous) {
    if (!previous || previous === 0) return null
    return ((current - previous) / previous) * 100
  }

  function toggleSort(column) {
    if (sortCol === column) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(column); setSortDir('desc') }
  }

  return (
    <Layout>
      <div className="w-full space-y-5 overflow-x-hidden">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold text-white leading-none" style={{ letterSpacing: '-0.04em' }}>
              Dashboard
            </h1>
            <p className="text-[12.5px] mt-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Vision consolidada del negocio
            </p>
          </div>
          <PeriodTabs activeKey={activeKey} onSelect={handlePeriod} />
        </div>

        {/* Tasks overview */}
        {hasTasks && (
          <TasksOverview {...taskCounts} navigate={navigate} />
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Total vendido"  value={kpis?.total_revenue}   formatter={formatCurrency}                           color={SERIES_COLORS.revenue}    iconPath="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 1 1 0 7H6"  change={changePct(kpis?.total_revenue, kpis?.prev_revenue)}       chartData={series} chartKey="revenue"    loading={loading} />
          <KpiCard label="Total invertido" value={kpis?.total_investment} formatter={formatCurrency}                           color={SERIES_COLORS.investment} iconPath="M4 17 9 12l3 3 8-8M4 7h5v5"                                       change={changePct(kpis?.total_investment, kpis?.prev_investment)} chartData={series} chartKey="investment" loading={loading} />
          <KpiCard label="ROAS"            value={kpis?.roas}             formatter={v => `${n(v).toFixed(2)}x`}              color={SERIES_COLORS.roas}       iconPath="M4 19h16M6 15l4-4 3 3 5-6"                                       change={changePct(kpis?.roas, kpis?.prev_roas)}                   chartData={series} chartKey="roas"       loading={loading} />
          <KpiCard label="Ganancia neta"   value={kpis?.net_profit}       formatter={formatCurrency}                           color={SERIES_COLORS.profit}     iconPath="M4 19h16M5 15c2-4 5-6 7-6s4 1 7 6M12 9V4"                       change={changePct(kpis?.net_profit, kpis?.prev_profit)}           chartData={series} chartKey="profit"     loading={loading} />
        </div>

        {isEmpty ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-12 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-[20px] flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.16)', color: '#F59E0B' }}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-[17px]" style={{ letterSpacing: '-0.02em' }}>Aun no hay datos para mostrar</p>
                <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  Carga tus datos para comenzar a ver insights y metricas de tu negocio en este periodo.
                </p>
              </div>
              <Link to="/cargar" className="inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-[13px] font-semibold text-black" style={{ background: '#F59E0B' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FCD34D'}
                onMouseLeave={e => e.currentTarget.style.background = '#F59E0B'}>
                Cargar datos
              </Link>
            </div>
            <div className="card p-6">
              <p className="text-[13px] font-semibold text-white mb-5" style={{ letterSpacing: '-0.02em' }}>Comenza en 3 pasos</p>
              <div className="space-y-4">
                {[
                  { n: 1, title: 'Cargar datos',     sub: 'Importa tus ventas, inversion y resultados.' },
                  { n: 2, title: 'Revisar metricas', sub: 'Analiza el rendimiento de tus campanas.' },
                  { n: 3, title: 'Obtener insights', sub: 'Recibi recomendaciones basadas en datos.' },
                ].map(step => (
                  <div key={step.n} className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold text-black" style={{ background: '#F59E0B' }}>{step.n}</div>
                    <div>
                      <p className="text-[13px] font-semibold text-white">{step.title}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '16px' }}>

            {/* Trend chart */}
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-[14px] font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>Tendencia</h2>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'revenue',    label: 'Ingresos',  color: SERIES_COLORS.revenue },
                    { key: 'investment', label: 'Inversion', color: SERIES_COLORS.investment },
                    { key: 'profit',     label: 'Ganancia',  color: SERIES_COLORS.profit },
                    { key: 'roas',       label: 'ROAS',      color: SERIES_COLORS.roas },
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setVisibleSeries(s => ({ ...s, [item.key]: !s[item.key] }))}
                      className="rounded-[7px] border px-2.5 py-1 text-[10.5px] font-semibold transition-all"
                      style={visibleSeries[item.key] ? {
                        background: `${item.color}18`, color: item.color, borderColor: `${item.color}35`,
                      } : {
                        background: 'transparent', color: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.07)',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div className="skeleton h-[320px] rounded-[12px]" />
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                      <defs>
                        {Object.entries(SERIES_COLORS).map(([key, color]) => (
                          <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={color} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 6" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: 'rgba(255,255,255,0.32)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.32)', fontSize: 11 }} axisLine={false} tickLine={false} width={68} tickFormatter={v => formatCurrency(v)} />
                      <Tooltip content={<TrendTooltip formatCurrency={formatCurrency} />} />
                      {visibleSeries.revenue    && <Area type="monotone" dataKey="revenue"    name="Ingresos"  stroke={SERIES_COLORS.revenue}    strokeWidth={2.5} fill={`url(#grad-revenue)`}    dot={false} activeDot={{ r: 4, fill: SERIES_COLORS.revenue }} />}
                      {visibleSeries.investment && <Area type="monotone" dataKey="investment" name="Inversion" stroke={SERIES_COLORS.investment} strokeWidth={2}   fill={`url(#grad-investment)`} dot={false} activeDot={{ r: 4, fill: SERIES_COLORS.investment }} />}
                      {visibleSeries.profit     && <Area type="monotone" dataKey="profit"     name="Ganancia"  stroke={SERIES_COLORS.profit}     strokeWidth={2}   fill={`url(#grad-profit)`}     dot={false} activeDot={{ r: 4, fill: SERIES_COLORS.profit }} />}
                      {visibleSeries.roas       && <Area type="monotone" dataKey="roas"       name="ROAS"      stroke={SERIES_COLORS.roas}       strokeWidth={2}   fill="none" strokeDasharray="5 4" dot={false} activeDot={{ r: 4, fill: SERIES_COLORS.roas }} />}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Alerts */}
            <div className="card p-5">
              <h2 className="text-[14px] font-semibold text-white mb-4" style={{ letterSpacing: '-0.02em' }}>Alertas</h2>
              <div className="space-y-3">
                {loading
                  ? [1, 2].map(i => <div key={i} className="skeleton h-20 rounded-[10px]" />)
                  : alerts.length === 0
                  ? <p className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.30)' }}>Sin alertas activas.</p>
                  : alerts.map((alert, i) => (
                    <div key={`${alert.title}-${i}`} className="rounded-[12px] p-4"
                      style={alert.tone === 'green' ? { background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.16)' }
                           : alert.tone === 'red'   ? { background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.16)' }
                                                    : { background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.16)' }}>
                      <p className="text-white text-[13px] font-bold" style={{ letterSpacing: '-0.01em' }}>{alert.title}</p>
                      <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{alert.body}</p>
                      {alert.action && (
                        <button onClick={alert.onAction} className="text-[11px] font-bold mt-2 hover:underline" style={{ color: '#F59E0B' }}>
                          {alert.action} →
                        </button>
                      )}
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Ranking - full width */}
            <div className="card overflow-hidden" style={{ gridColumn: '1 / -1' }}>
              <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 className="text-[14px] font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>Ranking de productos</h2>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-[6px]" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.40)' }}>
                  {formatNumber(kpis?.total_records ?? 0)} reg.
                </span>
              </div>
              {loading ? (
                <div className="p-5 space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-[10px]" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {[
                          { key: null,         label: '#' },
                          { key: null,         label: 'Producto' },
                          { key: 'revenue',    label: 'Ingresos' },
                          { key: 'investment', label: 'Inversion' },
                          { key: 'roas',       label: 'ROAS' },
                          { key: 'profit',     label: 'Ganancia' },
                          { key: null,         label: '' },
                        ].map(col => (
                          <th key={col.label} onClick={() => col.key && toggleSort(col.key)}
                            className={`px-5 py-3.5 text-left text-[10.5px] uppercase font-semibold tracking-[0.14em] ${col.key ? 'cursor-pointer' : ''}`}
                            style={{ color: 'rgba(255,255,255,0.30)' }}>
                            {col.label}
                            {col.key === sortCol && <span className="ml-1" style={{ color: '#F59E0B' }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((product, index) => (
                        <tr key={product.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td className="px-5 py-4 text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>{index + 1}</td>
                          <td className="px-5 py-4"><p className="text-[13px] font-semibold text-white truncate max-w-[200px]">{product.name}</p></td>
                          <td className="px-5 py-4 text-[13px] font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(product.revenue)}</td>
                          <td className="px-5 py-4 text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{formatCurrency(product.investment)}</td>
                          <td className="px-5 py-4">
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-[6px]"
                              style={product.roas >= 3
                                ? { background: 'rgba(52,211,153,0.12)', color: '#34D399' }
                                : product.roas >= 1.5
                                ? { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }
                                : { background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>
                              {product.roas ? `${n(product.roas).toFixed(2)}x` : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[13px] font-bold" style={{ color: n(product.profit) >= 0 ? '#34D399' : '#F87171' }}>
                            {formatCurrency(product.profit)}
                          </td>
                          <td className="px-5 py-4">
                            <button onClick={() => navigate(`/productos/${product.id}`)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-[6px] transition-all"
                              style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.08)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.16)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.08)'}>
                              Ver →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pie + Bar side by side - full width row */}
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="card p-5">
                <h2 className="text-[14px] font-semibold text-white mb-4" style={{ letterSpacing: '-0.02em' }}>Distribucion de ingresos</h2>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={4} strokeWidth={0}>
                        {pieData.map((item, i) => (
                          <Cell key={`${item.name}-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={0.90} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip formatCurrency={formatCurrency} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-5">
                <h2 className="text-[14px] font-semibold text-white mb-4" style={{ letterSpacing: '-0.02em' }}>ROAS por producto</h2>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roasData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="roas-bar" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%"   stopColor="#818CF8" />
                          <stop offset="100%" stopColor="#A78BFA" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 6" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={84} tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<RoasTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="roas" radius={[0, 8, 8, 0]} fill="url(#roas-bar)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* AI insights - full width */}
            {!loading && kpis?.total_records > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <AIRecommendations summary={summary} dateFrom={dateFrom} dateTo={dateTo} />
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
