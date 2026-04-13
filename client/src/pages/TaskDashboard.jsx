import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import Layout from '../components/Layout'

// ─── helpers ────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10)

const PRIORITY = {
  high:   { label: 'Alta',   tone: 'text-[#ff9ca8] bg-[#fb7185]/12 border-[#fb7185]/22' },
  medium: { label: 'Media',  tone: 'text-[#ffd27d] bg-[#f5b641]/12 border-[#f5b641]/22' },
  low:    { label: 'Baja',   tone: 'text-[#8fa5c6] bg-[#8fa5c6]/10 border-[#8fa5c6]/18' },
}

const DAY_LABELS  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function Icon({ path, className = 'w-4 h-4', stroke = 1.8 }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke} d={path} />
    </svg>
  )
}

// ─── skeleton ───────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="skeleton h-2.5 w-24 rounded-full" />
        <div className="skeleton w-9 h-9 rounded-2xl" />
      </div>
      <div className="skeleton h-9 w-14 rounded-xl" />
      <div className="skeleton h-2.5 w-32 rounded-full" />
    </div>
  )
}

// ─── chart tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-elevated px-3.5 py-2.5 border border-white/10">
      <p className="text-[#7d8ca5] text-[11px] mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color ?? '#f5b641' }}>
          {p.name}: <span>{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── KPI card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, iconPath }) {
  return (
    <div
      className="card p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ borderColor: `${accent}22` }}
    >
      {/* Subtle accent glow in corner */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}14 0%, transparent 70%)` }}
      />
      <div className="flex items-center justify-between relative">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#7d8ca5] font-semibold">{label}</p>
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}16`, color: accent, boxShadow: `0 0 16px ${accent}20` }}
        >
          <Icon path={iconPath} className="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className="font-display text-[34px] font-bold text-white leading-none tracking-tight relative" style={{ color: accent === '#fb7185' && value > 0 ? accent : 'white' }}>
        {value}
      </p>
      <p className="text-xs text-[#7d8ca5] leading-relaxed relative">{sub}</p>
    </div>
  )
}

// ─── main component ─────────────────────────────────────────────────────────

export default function TaskDashboard() {
  const [tasks, setTasks]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/tasks')
      .then(r => setTasks(r.data))
      .finally(() => setLoading(false))
  }, [])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total      = tasks.length
    const completed  = tasks.filter(t => t.status === 'completed').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    const reviewing  = tasks.filter(t => t.status === 'reviewing').length
    const overdue    = tasks.filter(t => t.status === 'overdue').length
    const pending    = tasks.filter(t => t.status === 'pending').length
    const rate       = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, inProgress, reviewing, overdue, pending, rate }
  }, [tasks])

  // ── Weekly bar chart (last 7 days, completadas por due_date) ──────────────
  const weeklyData = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (6 - i))
      const dateStr = d.toISOString().slice(0, 10)
      const total   = tasks.filter(t => t.due_date?.slice(0, 10) === dateStr).length
      const done    = tasks.filter(t => t.due_date?.slice(0, 10) === dateStr && t.status === 'completed').length
      return { day: DAY_LABELS[d.getDay()], date: dateStr, total, done }
    })
  }, [tasks])

  // ── Priority distribution bar ─────────────────────────────────────────────
  const priorityData = useMemo(() => [
    { label: 'Alta',   value: tasks.filter(t => t.priority === 'high').length,   color: '#fb7185' },
    { label: 'Media',  value: tasks.filter(t => t.priority === 'medium').length, color: '#f5b641' },
    { label: 'Baja',   value: tasks.filter(t => t.priority === 'low').length,    color: '#8fa5c6' },
  ], [tasks])

  // ── Status breakdown bars ─────────────────────────────────────────────────
  const statusData = useMemo(() => [
    { label: 'Completadas',  value: kpis.completed,  color: '#22c55e' },
    { label: 'En curso',     value: kpis.inProgress, color: '#4dd7ff' },
    { label: 'En revisión',  value: kpis.reviewing,  color: '#8b5cf6' },
    { label: 'Pendientes',   value: kpis.pending,    color: '#f5b641' },
    { label: 'Vencidas',     value: kpis.overdue,    color: '#fb7185' },
  ].filter(s => s.value > 0), [kpis])

  // ── Heatmap: 12 weeks × 7 days ────────────────────────────────────────────
  const { heatmapWeeks, maxHeat } = useMemo(() => {
    // build date → count map using due_date of completed tasks
    const map = {}
    tasks.forEach(t => {
      if (t.status !== 'completed' || !t.due_date) return
      const d = t.due_date.slice(0, 10)
      map[d] = (map[d] || 0) + 1
    })

    const today  = new Date()
    const todayDow = today.getDay()                        // 0=Sun … 6=Sat
    // align to start of a full 12-week window (Sunday of week -11)
    const start  = new Date(today)
    start.setDate(today.getDate() - todayDow - 11 * 7)

    const cursor = new Date(start)
    const weeks  = []
    let   max    = 1

    for (let w = 0; w < 12; w++) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const dateStr = cursor.toISOString().slice(0, 10)
        const isPast  = dateStr <= todayStr()
        const count   = isPast ? (map[dateStr] || 0) : null
        if (count > max) max = count
        week.push({ date: dateStr, count, month: cursor.getMonth(), day: cursor.getDate() })
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(week)
    }

    return { heatmapWeeks: weeks, maxHeat: max }
  }, [tasks])

  // ── Completed tasks table (latest 20) ─────────────────────────────────────
  const completedTasks = useMemo(() =>
    tasks
      .filter(t => t.status === 'completed')
      .sort((a, b) => (b.due_date ?? '').localeCompare(a.due_date ?? ''))
      .slice(0, 20)
  , [tasks])

  // ── Heatmap cell colour ────────────────────────────────────────────────────
  function heatColor(count) {
    if (count === null) return 'rgba(255,255,255,0.03)'
    if (count === 0)    return 'rgba(255,255,255,0.05)'
    const t = Math.min(count / maxHeat, 1)
    return `rgba(245,182,65,${(0.18 + t * 0.78).toFixed(2)})`
  }
  function heatGlow(count) {
    if (!count) return 'none'
    const t = Math.min(count / maxHeat, 1)
    return t > 0.45 ? `0 0 6px rgba(245,182,65,${(t * 0.45).toFixed(2)})` : 'none'
  }

  // ── Month labels for heatmap ───────────────────────────────────────────────
  function weekMonthLabel(week) {
    const first = week[0]
    if (!first) return null
    const d = new Date(first.date)
    // show label only when this week contains the 1st of a month
    if (d.getDate() <= 7) return MONTH_SHORT[d.getMonth()]
    return null
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="space-y-6 max-w-[1400px] mx-auto overflow-x-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                to="/tareas"
                className="w-8 h-8 rounded-2xl border border-white/10 text-[#8ea0bc] hover:text-white hover:border-white/20 flex items-center justify-center transition-all duration-200 shrink-0"
              >
                <Icon path="M15 19l-7-7 7-7" className="w-4 h-4" />
              </Link>
              <h1 className="font-display text-[26px] md:text-[32px] font-bold text-white tracking-tight">
                Stats de <span className="text-[#f5b641]">Tareas</span>
              </h1>
            </div>
            <p className="text-[#7d8ca5] text-sm ml-11">Productividad, flujo y completadas del equipo</p>
          </div>

          {/* Completion ring */}
          {!loading && (
            <div className="card px-5 py-4 flex items-center gap-4 border-[#f5b641]/16">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(245,182,65,0.08)" strokeWidth="4" />
                  <circle
                    cx="22" cy="22" r="18" fill="none"
                    stroke="#f5b641" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 18}`}
                    strokeDashoffset={`${2 * Math.PI * 18 * (1 - kpis.rate / 100)}`}
                    style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 4px rgba(245,182,65,0.45))' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-[#f5b641]">
                  {kpis.rate}%
                </span>
              </div>
              <div>
                <p className="text-white text-[14px] font-semibold">Tasa de completado</p>
                <p className="text-[#7d8ca5] text-xs mt-0.5">{kpis.completed} de {kpis.total} tareas</p>
              </div>
            </div>
          )}
        </div>

        {/* ── KPI grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <KpiCard
                label="Total tareas"
                value={kpis.total}
                sub="Todas las tareas registradas"
                accent="#4dd7ff"
                iconPath="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
              />
              <KpiCard
                label="Completadas"
                value={kpis.completed}
                sub={`${kpis.rate}% del total resuelto`}
                accent="#22c55e"
                iconPath="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
              />
              <KpiCard
                label="En curso"
                value={kpis.inProgress}
                sub={`${kpis.pending} pendiente${kpis.pending !== 1 ? 's' : ''} sin iniciar`}
                accent="#f5b641"
                iconPath="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
              />
              <KpiCard
                label="Vencidas"
                value={kpis.overdue}
                sub={kpis.overdue > 0 ? 'Requieren atención inmediata' : 'Todo dentro de fecha'}
                accent="#fb7185"
                iconPath="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              />
            </>
          )}
        </div>

        {/* ── Charts row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Weekly bar chart */}
          <div className="lg:col-span-2 card p-5">
            <div className="mb-5">
              <p className="text-white font-semibold text-sm">Productividad semanal</p>
              <p className="text-[#7d8ca5] text-xs mt-0.5">
                Tareas por fecha límite en los últimos 7 días
              </p>
            </div>
            {loading ? (
              <div className="skeleton h-52 rounded-2xl" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={weeklyData} barSize={26} barGap={4}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.07)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#7d8ca5', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#7d8ca5', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={26}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: 'rgba(245,182,65,0.05)', radius: 8 }}
                    />
                    <Bar dataKey="done" name="Completadas" radius={[7, 7, 0, 0]}>
                      {weeklyData.map((e, i) => (
                        <Cell
                          key={i}
                          fill={e.done > 0 ? '#f5b641' : 'rgba(148,163,184,0.08)'}
                          fillOpacity={e.done > 0 ? 1 : 1}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="total" name="Con fecha límite" radius={[7, 7, 0, 0]} fill="rgba(77,215,255,0.18)" />
                  </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex items-center gap-5 mt-3 pl-1">
                  {[
                    { color: '#f5b641', label: 'Completadas' },
                    { color: 'rgba(77,215,255,0.5)', label: 'Con fecha límite' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: l.color }} />
                      <span className="text-[11px] text-[#7d8ca5]">{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right column: status + priority */}
          <div className="flex flex-col gap-5">

            {/* Status distribution */}
            <div className="card p-5 flex-1">
              <p className="text-white font-semibold text-sm mb-0.5">Estado del pipeline</p>
              <p className="text-[#7d8ca5] text-xs mb-5">Distribución por estado actual</p>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-8 rounded-2xl" />
                  ))}
                </div>
              ) : statusData.length === 0 ? (
                <p className="text-[#7d8ca5] text-sm">Sin tareas cargadas.</p>
              ) : (
                <div className="space-y-3.5">
                  {statusData.map(s => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] text-[#c0cee4] font-medium">{s.label}</span>
                        <span className="text-[12px] font-bold tabular-nums" style={{ color: s.color }}>
                          {s.value}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: kpis.total > 0 ? `${(s.value / kpis.total) * 100}%` : '0%',
                            background: s.color,
                            boxShadow: `0 0 8px ${s.color}50`,
                            transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority distribution */}
            <div className="card p-5">
              <p className="text-white font-semibold text-sm mb-0.5">Distribución por prioridad</p>
              <p className="text-[#7d8ca5] text-xs mb-4">Todas las tareas activas</p>
              {loading ? (
                <div className="skeleton h-16 rounded-2xl" />
              ) : (
                <div className="space-y-2.5">
                  {priorityData.map(p => (
                    <div key={p.label} className="flex items-center gap-3">
                      <span className="text-[12px] text-[#8ea0bc] w-10 shrink-0">{p.label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: kpis.total > 0 ? `${(p.value / kpis.total) * 100}%` : '0%',
                            background: p.color,
                            boxShadow: `0 0 7px ${p.color}45`,
                            transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
                          }}
                        />
                      </div>
                      <span className="text-[12px] font-bold tabular-nums w-5 text-right" style={{ color: p.color }}>
                        {p.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Heatmap ────────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <p className="text-white font-semibold text-sm">Mapa de actividad</p>
              <p className="text-[#7d8ca5] text-xs mt-0.5">
                Tareas completadas en los últimos 84 días · por fecha límite
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 text-[11px] text-[#4f6278]">
              <span>Menos</span>
              {[0, 0.2, 0.45, 0.7, 1].map((t, i) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 rounded-[4px]"
                  style={{
                    background: t === 0
                      ? 'rgba(255,255,255,0.05)'
                      : `rgba(245,182,65,${(0.18 + t * 0.78).toFixed(2)})`,
                  }}
                />
              ))}
              <span>Más</span>
            </div>
          </div>

          {loading ? (
            <div className="skeleton h-28 rounded-2xl" />
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-[3px] min-w-max">

                {/* Day-of-week labels */}
                <div className="flex flex-col gap-[3px] mr-0.5">
                  <div className="h-4" />{/* month row spacer */}
                  {DAY_LABELS.map((d, i) => (
                    <div key={i} className="w-7 h-4 flex items-center">
                      <span className="text-[10px] text-[#3a4d5c] leading-none">
                        {i % 2 === 1 ? d : ''}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Week columns */}
                {heatmapWeeks.map((week, wi) => {
                  const monthLabel = weekMonthLabel(week)
                  return (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {/* Month label row */}
                      <div className="h-4 flex items-start">
                        {monthLabel && (
                          <span className="text-[10px] text-[#4f6278] whitespace-nowrap leading-none">
                            {monthLabel}
                          </span>
                        )}
                      </div>
                      {/* Day cells */}
                      {week.map((cell, di) => (
                        <div
                          key={di}
                          title={
                            cell.count === null
                              ? cell.date
                              : `${cell.date}: ${cell.count} tarea${cell.count !== 1 ? 's' : ''}`
                          }
                          className="w-4 h-4 rounded-[4px] cursor-default transition-opacity duration-150 hover:opacity-75"
                          style={{
                            background: heatColor(cell.count),
                            boxShadow: heatGlow(cell.count),
                          }}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Completed tasks table ──────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-white font-semibold text-sm">Tareas completadas</p>
              <p className="text-[#7d8ca5] text-xs mt-0.5">
                Historial · últimas {completedTasks.length}
              </p>
            </div>
            <Link
              to="/tareas"
              className="text-[12px] text-[#f5b641] hover:text-[#ffca62] transition-colors duration-200 flex items-center gap-1"
            >
              Ver tablero
              <Icon path="M9 5l7 7-7 7" className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-2xl" />
              ))}
            </div>
          ) : completedTasks.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] py-14 text-center">
              <Icon
                path="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                className="w-10 h-10 mx-auto text-[#2a3d56] mb-3"
              />
              <p className="text-[#7d8ca5] text-sm">No hay tareas completadas aún.</p>
              <p className="text-[#4f6278] text-xs mt-1">
                Las tareas marcadas como completadas aparecerán aquí.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.07]">
                      {['Tarea', 'Prioridad', 'Producto', 'Fecha límite'].map(h => (
                        <th
                          key={h}
                          className="text-left text-[11px] uppercase tracking-[0.18em] text-[#4f6278] font-semibold pb-3 pr-5 last:pr-0"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {completedTasks.map(task => (
                      <tr
                        key={task.id}
                        className="hover:bg-white/[0.02] transition-colors duration-150"
                      >
                        <td className="py-3.5 pr-5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                background: '#22c55e',
                                boxShadow: '0 0 6px rgba(34,197,94,0.55)',
                              }}
                            />
                            <span className="text-[#ccdaf0] font-medium truncate max-w-[220px]">
                              {task.title}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 pr-5">
                          {task.priority && PRIORITY[task.priority] ? (
                            <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${PRIORITY[task.priority].tone}`}>
                              {PRIORITY[task.priority].label}
                            </span>
                          ) : (
                            <span className="text-[#3a4d5c] text-xs">—</span>
                          )}
                        </td>

                        <td className="py-3.5 pr-5">
                          {task.product_name ? (
                            <span className="text-[11px] text-[#81e3ff] bg-[#4dd7ff]/10 border border-[#4dd7ff]/16 px-2.5 py-1 rounded-full">
                              {task.product_name}
                            </span>
                          ) : (
                            <span className="text-[#3a4d5c] text-xs">—</span>
                          )}
                        </td>

                        <td className="py-3.5 text-[#7d8ca5] text-xs tabular-nums">
                          {task.due_date
                            ? new Date(task.due_date + 'T12:00:00').toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : <span className="text-[#3a4d5c]">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-2">
                {completedTasks.map(task => (
                  <div
                    key={task.id}
                    className="rounded-[18px] border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.55)' }}
                      />
                      <span className="text-[#ccdaf0] text-sm font-medium truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.priority && PRIORITY[task.priority] && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${PRIORITY[task.priority].tone}`}>
                          {PRIORITY[task.priority].label}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-[11px] text-[#7d8ca5] tabular-nums">
                          {new Date(task.due_date + 'T12:00:00').toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </Layout>
  )
}
