import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useToast } from '../context/ToastContext'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = v => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${Math.round(v)}`
const roasColor = r => r >= 3 ? '#34D399' : r >= 1.5 ? '#F59E0B' : '#F87171'

function MiniBar({ value, max, color = '#F59E0B' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
    </div>
  )
}

function SparkLine({ values = [], color = '#F59E0B', w = 80, h = 32 }) {
  if (values.length < 2) return <svg width={w} height={h} />
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 4) + 2
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" /></svg>
  )
}

// ── Tab: Comparador de productos ──────────────────────────────────────────────
function TabComparador({ products }) {
  const [metric, setMetric] = useState('total_revenue')
  const sorted = useMemo(() => [...products].sort((a, b) => (b[metric] || 0) - (a[metric] || 0)), [products, metric])
  const maxVal = sorted[0]?.[metric] || 1

  const metrics = [
    { key: 'total_revenue', label: 'Facturación', color: '#34D399' },
    { key: 'total_investment', label: 'Inversion', color: '#60A5FA' },
    { key: 'avg_roas', label: 'ROAS', color: '#F59E0B' },
    { key: 'sale_count', label: 'Registros', color: '#818CF8' },
  ]
  const cur = metrics.find(m => m.key === metric)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {metrics.map(m => (
          <button key={m.key} onClick={() => setMetric(m.key)} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: metric === m.key ? m.color : 'rgba(255,255,255,0.06)',
            color: metric === m.key ? '#0E0E14' : 'rgba(255,255,255,0.5)',
          }}>{m.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((p, i) => {
          const val = p[metric] || 0
          const display = metric === 'avg_roas' ? `${val.toFixed(2)}x` : metric === 'sale_count' ? val : fmt(val)
          return (
            <div key={p.id} className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', width: 18, textAlign: 'right' }}>#{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 500, color: '#fff', fontSize: 14 }}>{p.name}</span>
                <span style={{ fontWeight: 700, color: cur.color, fontSize: 15 }}>{display}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 18 }} />
                <MiniBar value={val} max={maxVal} color={cur.color} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab: Patrones ─────────────────────────────────────────────────────────────
function TabPatrones({ sales }) {
  // Group by weekday
  const byDay = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
    const acc = Array.from({ length: 7 }, (_, i) => ({ day: days[i], revenue: 0, count: 0 }))
    for (const s of sales) {
      const d = new Date(s.date + 'T12:00:00').getDay()
      acc[d].revenue += s.revenue
      acc[d].count++
    }
    return acc
  }, [sales])

  // Group by month
  const byMonth = useMemo(() => {
    const acc = {}
    for (const s of sales) {
      const key = s.date.slice(0, 7)
      if (!acc[key]) acc[key] = { month: key, revenue: 0, investment: 0, count: 0 }
      acc[key].revenue += s.revenue
      acc[key].investment += s.investment
      acc[key].count++
    }
    return Object.values(acc).sort((a, b) => a.month.localeCompare(b.month)).slice(-12)
  }, [sales])

  const maxDayRev = Math.max(...byDay.map(d => d.revenue)) || 1
  const maxMonthRev = Math.max(...byMonth.map(m => m.revenue)) || 1

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* By weekday */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#fff' }}>Facturación por día de la semana</h3>
        {byDay.map(d => (
          <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ width: 30, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{d.day}</span>
            <MiniBar value={d.revenue} max={maxDayRev} color="#818CF8" />
            <span style={{ width: 60, fontSize: 12, color: '#818CF8', textAlign: 'right', fontWeight: 600 }}>{fmt(d.revenue)}</span>
          </div>
        ))}
      </div>

      {/* By month */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#fff' }}>Evolucion mensual</h3>
        {byMonth.map(m => {
          const roas = m.investment > 0 ? m.revenue / m.investment : 0
          return (
            <div key={m.month} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{m.month}</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>{fmt(m.revenue)}</span>
                  <span style={{ fontSize: 12, color: roasColor(roas), fontWeight: 600 }}>{roas.toFixed(1)}x</span>
                </div>
              </div>
              <MiniBar value={m.revenue} max={maxMonthRev} color="#34D399" />
            </div>
          )
        })}
        {byMonth.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Sin datos suficientes</div>}
      </div>

      {/* Best/worst */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#fff' }}>Top 5 mejores dias</h3>
        {[...sales].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((s, i) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{s.product_name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.date}</div>
            </div>
            <span style={{ color: '#34D399', fontWeight: 700 }}>{fmt(s.revenue)}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#fff' }}>5 peores ROAS</h3>
        {[...sales].filter(s => s.investment > 0).sort((a, b) => (a.revenue / a.investment) - (b.revenue / b.investment)).slice(0, 5).map(s => {
          const r = s.revenue / s.investment
          return (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{s.product_name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.date}</div>
              </div>
              <span style={{ color: roasColor(r), fontWeight: 700 }}>{r.toFixed(2)}x</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab: Proyecciones ─────────────────────────────────────────────────────────
function TabProyecciones({ sales }) {
  const months = useMemo(() => {
    const acc = {}
    for (const s of sales) {
      const key = s.date.slice(0, 7)
      if (!acc[key]) acc[key] = { revenue: 0, investment: 0 }
      acc[key].revenue += s.revenue
      acc[key].investment += s.investment
    }
    return Object.entries(acc).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([k, v]) => ({ month: k, ...v }))
  }, [sales])

  if (months.length < 2) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>Necesitas al menos 2 meses de datos para ver proyecciones.</div>
  }

  const last = months[months.length - 1]
  const prev = months[months.length - 2]
  const growthRate = prev.revenue > 0 ? (last.revenue - prev.revenue) / prev.revenue : 0

  const next3 = [1, 2, 3].map(n => {
    const [y, m] = last.month.split('-').map(Number)
    const d = new Date(y, m - 1 + n, 1)
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const proj = last.revenue * Math.pow(1 + growthRate, n)
    return { month: label, projected: proj, optimistic: proj * 1.15, conservative: proj * 0.85 }
  })

  const allRevs = months.map(m => m.revenue)
  const maxRev = Math.max(...allRevs, ...next3.map(n => n.optimistic)) || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Growth rate badge */}
      <div className="card" style={{ padding: 20, display: 'flex', gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Tasa de crecimiento (m/m)</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: growthRate >= 0 ? '#34D399' : '#F87171' }}>
            {growthRate >= 0 ? '+' : ''}{(growthRate * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Mes base</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{fmt(last.revenue)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Proyeccion +1 mes</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B' }}>{fmt(next3[0].projected)}</div>
        </div>
      </div>

      {/* Historical + projection chart (bar) */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#fff' }}>Historico + proyeccion</h3>
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', height: 120 }}>
          {months.map(m => (
            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '60%', height: `${(m.revenue / maxRev) * 100}px`, background: '#34D399', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 28 }}>{m.month.slice(5)}</div>
            </div>
          ))}
          {next3.map(n => (
            <div key={n.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '60%', height: `${(n.projected / maxRev) * 100}px`, background: 'rgba(245,158,11,0.4)', border: '1px dashed #F59E0B', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
              <div style={{ fontSize: 9, color: '#F59E0B', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 28 }}>{n.month.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Projection table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Mes', 'Conservador', 'Base', 'Optimista'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {next3.map(n => (
              <tr key={n.month} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 16px', color: '#F59E0B', fontWeight: 600 }}>{n.month}</td>
                <td style={{ padding: '10px 16px', color: '#F87171' }}>{fmt(n.conservative)}</td>
                <td style={{ padding: '10px 16px', color: '#fff', fontWeight: 600 }}>{fmt(n.projected)}</td>
                <td style={{ padding: '10px 16px', color: '#34D399' }}>{fmt(n.optimistic)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab: Simulador de presupuesto ─────────────────────────────────────────────
function TabPresupuesto({ products }) {
  const [investment, setInvestment] = useState(10000)
  const [targetRoas, setTargetRoas] = useState(2.5)

  const avgRoas = products.length
    ? products.reduce((s, p) => s + (p.avg_roas || 0), 0) / products.length
    : 2

  const projectedRevenue = investment * targetRoas
  const projectedProfit = projectedRevenue - investment
  const currentAvgRevenue = investment * avgRoas

  // Split among products proportionally to their historical revenue
  const totalHistRev = products.reduce((s, p) => s + (p.total_revenue || 0), 0) || 1
  const allocation = products.slice(0, 8).map(p => ({
    name: p.name,
    share: (p.total_revenue || 0) / totalHistRev,
    investment: investment * ((p.total_revenue || 0) / totalHistRev),
    projRev: investment * ((p.total_revenue || 0) / totalHistRev) * (p.avg_roas || avgRoas),
  }))

  const sliderStyle = { width: '100%', accentColor: '#F59E0B', cursor: 'pointer' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 600, color: '#fff' }}>Parametros</h3>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Presupuesto total</label>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>{fmt(investment)}</span>
            </div>
            <input type="range" min={1000} max={500000} step={1000} value={investment}
              onChange={e => setInvestment(Number(e.target.value))} style={sliderStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
              <span>$1K</span><span>$500K</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>ROAS objetivo</label>
              <span style={{ fontSize: 14, fontWeight: 700, color: roasColor(targetRoas) }}>{targetRoas.toFixed(1)}x</span>
            </div>
            <input type="range" min={0.5} max={10} step={0.1} value={targetRoas}
              onChange={e => setTargetRoas(Number(e.target.value))} style={sliderStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
              <span>0.5x</span><span>10x</span>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Tu ROAS promedio actual: <span style={{ color: roasColor(avgRoas), fontWeight: 700 }}>{avgRoas.toFixed(2)}x</span>
          </div>
        </div>

        {/* Summary */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#fff' }}>Resultado estimado</h3>
          {[
            ['Inversion', fmt(investment), '#60A5FA'],
            ['Facturación proyectada', fmt(projectedRevenue), '#34D399'],
            ['Profit proyectado', fmt(projectedProfit), projectedProfit >= 0 ? '#34D399' : '#F87171'],
            ['Con ROAS actual', fmt(currentAvgRevenue), '#818CF8'],
          ].map(([l, v, c]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{l}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Product allocation */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#fff' }}>Distribucion sugerida por producto</h3>
        {allocation.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Sin productos con datos historicos</div>}
        {allocation.map(a => (
          <div key={a.name} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{a.name}</span>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 12, color: '#60A5FA' }}>{fmt(a.investment)}</span>
                <span style={{ fontSize: 12, color: '#34D399' }}>→ {fmt(a.projRev)}</span>
              </div>
            </div>
            <MiniBar value={a.share} max={1} color="#60A5FA" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab: IA Insights ──────────────────────────────────────────────────────────
function TabIA({ products, sales }) {
  const insights = useMemo(() => {
    const list = []
    if (!products.length) return list

    const byRevenue = [...products].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
    const byRoas = [...products].filter(p => p.sale_count > 0).sort((a, b) => (b.avg_roas || 0) - (a.avg_roas || 0))
    const lowRoas = products.filter(p => (p.avg_roas || 0) > 0 && (p.avg_roas || 0) < 1.5)
    const avgRoas = products.reduce((s, p) => s + (p.avg_roas || 0), 0) / products.length

    if (byRevenue[0]) {
      list.push({
        type: 'success',
        icon: '🏆',
        title: 'Producto estrella',
        body: `${byRevenue[0].name} genera el mayor revenue con ${fmt(byRevenue[0].total_revenue || 0)}. Considera aumentar su presupuesto.`,
      })
    }
    if (byRoas[0] && byRoas[0].avg_roas > avgRoas * 1.5) {
      list.push({
        type: 'success',
        icon: '🚀',
        title: 'Mayor eficiencia',
        body: `${byRoas[0].name} tiene el mejor ROAS (${(byRoas[0].avg_roas || 0).toFixed(2)}x), muy por encima del promedio (${avgRoas.toFixed(2)}x). Es tu producto mas eficiente.`,
      })
    }
    if (lowRoas.length > 0) {
      list.push({
        type: 'warning',
        icon: '⚠️',
        title: `${lowRoas.length} producto${lowRoas.length > 1 ? 's' : ''} con ROAS bajo`,
        body: `${lowRoas.map(p => p.name).join(', ')} tienen ROAS menor a 1.5x. Revisar estrategia de inversion o pausar.`,
      })
    }

    // Month-over-month
    const months = {}
    for (const s of sales) {
      const key = s.date.slice(0, 7)
      if (!months[key]) months[key] = 0
      months[key] += s.revenue
    }
    const mKeys = Object.keys(months).sort()
    if (mKeys.length >= 2) {
      const last = months[mKeys[mKeys.length - 1]]
      const prev = months[mKeys[mKeys.length - 2]]
      const growth = prev > 0 ? ((last - prev) / prev) * 100 : 0
      list.push({
        type: growth >= 0 ? 'success' : 'warning',
        icon: growth >= 0 ? '📈' : '📉',
        title: `Crecimiento mes anterior: ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
        body: growth >= 0
          ? `Facturación del último mes (${fmt(last)}) supera al anterior (${fmt(prev)}). Buen ritmo.`
          : `Facturación baja el último mes (${fmt(last)} vs ${fmt(prev)}). Analiza que productos cayeron.`,
      })
    }

    if (products.length >= 3) {
      const top3Rev = byRevenue.slice(0, 3).reduce((s, p) => s + (p.total_revenue || 0), 0)
      const total = products.reduce((s, p) => s + (p.total_revenue || 0), 0)
      const conc = total > 0 ? (top3Rev / total) * 100 : 0
      if (conc > 80) {
        list.push({
          type: 'info',
          icon: '🎯',
          title: 'Alta concentración de facturación',
          body: `Los 3 productos principales generan el ${conc.toFixed(0)}% de la facturación total. Considerar diversificar.`,
        })
      }
    }

    return list
  }, [products, sales])

  const typeColors = { success: '#34D399', warning: '#F59E0B', info: '#60A5FA' }
  const typeBg = { success: 'rgba(52,211,153,0.07)', warning: 'rgba(245,158,11,0.07)', info: 'rgba(96,165,250,0.07)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {insights.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>
          Agrega mas datos para ver insights automaticos.
        </div>
      )}
      {insights.map((ins, i) => (
        <div key={i} className="card" style={{ padding: 20, background: typeBg[ins.type], borderLeft: `3px solid ${typeColors[ins.type]}` }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22 }}>{ins.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: typeColors[ins.type], marginBottom: 6, fontSize: 14 }}>{ins.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{ins.body}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Insights() {
  const { showToast } = useToast()
  const [tab, setTab] = useState('comparador')
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([axios.get('/api/products'), axios.get('/api/sales')])
      .then(([{ data: prods }, { data: sls }]) => {
        setProducts(prods)
        setSales(sls)
      })
      .catch(() => showToast('Error cargando datos', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'comparador', label: 'Comparador' },
    { key: 'patrones', label: 'Patrones' },
    { key: 'proyecciones', label: 'Proyecciones' },
    { key: 'presupuesto', label: 'Simulador' },
    { key: 'ia', label: 'IA Insights' },
  ]

  return (
    <Layout>
      <div className="page-shell">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Insights</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Analisis avanzado de tus datos
          </p>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: tab === t.key ? 'rgba(255,255,255,0.12)' : 'none',
              border: 'none', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.45)',
              padding: '7px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400, transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>Cargando...</div>
        ) : (
          <>
            {tab === 'comparador' && <TabComparador products={products} />}
            {tab === 'patrones' && <TabPatrones sales={sales} />}
            {tab === 'proyecciones' && <TabProyecciones sales={sales} />}
            {tab === 'presupuesto' && <TabPresupuesto products={products} />}
            {tab === 'ia' && <TabIA products={products} sales={sales} />}
          </>
        )}
      </div>
    </Layout>
  )
}
