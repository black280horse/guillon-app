import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

// ── Quotes ────────────────────────────────────────────────────────────────────
const QUOTES = [
  "El dinero fluye hacia quienes crean valor real todos los días.",
  "Cada peso invertido con intención es una semilla de abundancia.",
  "La publicidad no es un gasto: es el amplificador de tu mejor oferta.",
  "Vender bien es ayudar a alguien a resolver un problema real. Hacelo con orgullo.",
  "Los datos no mienten. Escuchalos y ajustá antes de que sea tarde.",
  "Una campaña optimizada hoy es libertad financiera mañana.",
  "El ROAS es la brújula. La visión es el destino.",
  "Agradecer lo que ya tenés abre espacio para lo que viene.",
  "Las grandes marcas se construyen con consistencia, no con suerte.",
  "Tu negocio crece al ritmo que vos crecés como operador.",
  "El mercado recompensa a quien muestra up. Aparecé todos los días.",
  "Cada cliente satisfecho es un activo que trabaja por vos.",
  "Los mejores resultados llegan cuando el análisis guía la acción.",
  "Invertir en conocer tus números es invertir en tu libertad.",
  "El crecimiento real se mide en tendencias, no en picos aislados.",
  "Una decisión basada en datos vale más que diez basadas en intuición.",
  "La mentalidad de abundancia empieza cuando dejas de competir y empezás a crear.",
  "El negocio que mides es el negocio que dominas.",
  "Cada optimización pequeña, compuesta en el tiempo, produce resultados extraordinarios.",
  "La gratitud y la ambición no se contradicen: se potencian.",
  "Hoy es un buen día para mejorar la métrica que más importa.",
  "El éxito en ventas es 20% producto y 80% mensaje correcto para la persona correcta.",
  "Confía en el proceso, verifica los números, ajusta con calma.",
  "Un mes difícil es datos. Dos meses difíciles son una señal. Actúa.",
  "La diferencia entre escalar y estancarse está en lo que hacés con la información.",
  "Construí un negocio que puedas medir. Medí un negocio que puedas escalar.",
  "La inversión con retorno claro no es un riesgo: es una palanca.",
  "Vendé con propósito. Medí con rigor. Crecé con intención.",
  "El marketing que funciona es el que conecta con un deseo real.",
  "Cada decisión de hoy es la base del resultado de mañana.",
]

function n(v) { return Number(v ?? 0) }

function fmtMoney(v) {
  const abs = Math.abs(v)
  if (abs >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return '$' + Math.round(v / 1000) + 'K'
  return '$' + v
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function monthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function prevMonthRange() {
  const d = new Date()
  const year = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear()
  const month = d.getMonth() === 0 ? 12 : d.getMonth()
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  return { start, end }
}

function monthLabel(date) {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

// ── DailyQuote ────────────────────────────────────────────────────────────────
function DailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  const quote = QUOTES[dayOfYear % QUOTES.length]
  return (
    <div style={{
      padding: '14px 18px',
      borderRadius: 12,
      background: 'linear-gradient(135deg, rgba(167,139,250,.08), rgba(245,158,11,.05))',
      border: '1px solid rgba(167,139,250,.16)',
      display: 'flex', alignItems: 'center', gap: 14,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: -20, top: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,.12), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ flexShrink: 0, fontSize: 22, lineHeight: 1 }}>✦</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.20em', color: '#A78BFA', marginBottom: 4 }}>Este mensaje hoy es para vos</div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.80)', margin: 0, lineHeight: 1.55, fontStyle: 'italic' }}>"{quote}"</p>
      </div>
    </div>
  )
}

// ── HomeGreeting ──────────────────────────────────────────────────────────────
function HomeGreeting({ userName }) {
  const now = new Date()
  const h = now.getHours()
  const greet = h < 6 ? 'Buenas noches' : h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
  const fmt = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const name = userName ? userName.split(' ')[0] : 'Admin'
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.18em', color: 'var(--accent, #F59E0B)', opacity: .85 }}>
        {fmt}
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 600, color: '#fff', letterSpacing: '-.04em', lineHeight: 1.05, margin: '8px 0 4px' }}>
        {greet}, <span style={{ color: 'var(--accent, #F59E0B)' }}>{name}</span>
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.42)', margin: 0 }}>
        Esto es lo que necesitás saber hoy.
      </p>
    </div>
  )
}

// ── TodaySnapshot ─────────────────────────────────────────────────────────────
function TodaySnapshot({ todayData, prevData }) {
  const rev = n(todayData?.total_revenue)
  const prevRev = n(prevData?.total_revenue)
  const revDelta = prevRev > 0 ? ((rev - prevRev) / prevRev) * 100 : null

  const roas = n(todayData?.roas)
  const prevRoas = n(prevData?.roas)
  const roasDelta = prevRoas > 0 ? ((roas - prevRoas) / prevRoas) * 100 : null

  const records = n(todayData?.total_records)

  const items = [
    { label: 'Ingresos hoy', value: fmtMoney(rev), delta: revDelta, color: '#F59E0B', icon: dollarIcon },
    { label: 'ROAS hoy',     value: roas > 0 ? roas.toFixed(2) + 'x' : '—', delta: roasDelta, color: '#A78BFA', icon: barUpIcon },
    { label: 'Nuevos registros', value: String(records), delta: null, color: '#22D3EE', icon: uploadIcon },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
      {items.map(it => {
        const positive = it.delta !== null && it.delta >= 0
        return (
          <div key={it.label} style={{
            padding: '14px 16px',
            borderRadius: 12,
            background: `color-mix(in oklab, ${it.color} 5%, transparent)`,
            border: `1px solid color-mix(in oklab, ${it.color} 18%, transparent)`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              display: 'grid', placeItems: 'center',
              background: `color-mix(in oklab, ${it.color} 14%, transparent)`,
              color: it.color,
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d={it.icon} />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(255,255,255,.40)' }}>{it.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: it.color, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {it.value}
                </span>
                {it.delta !== null && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: positive ? '#34D399' : '#F87171' }}>
                    {positive ? '▲' : '▼'} {Math.abs(it.delta).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── CriticalAlertCard ─────────────────────────────────────────────────────────
function CriticalAlertCard({ alert, onNavigate }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 12,
      background: `linear-gradient(135deg, color-mix(in oklab, ${alert.color} 10%, transparent), color-mix(in oklab, ${alert.color} 3%, transparent))`,
      border: `1px solid color-mix(in oklab, ${alert.color} 28%, transparent)`,
      display: 'flex', gap: 14, alignItems: 'flex-start',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: alert.color,
        boxShadow: `0 0 12px ${alert.color}`,
      }} />
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        display: 'grid', placeItems: 'center', flexShrink: 0,
        background: `color-mix(in oklab, ${alert.color} 18%, transparent)`,
        color: alert.color,
      }}>
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d={alert.icon === 'alert' ? alertIcon : dollarIcon} />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em',
            color: alert.color,
            padding: '2px 7px', borderRadius: 5,
            background: `color-mix(in oklab, ${alert.color} 15%, transparent)`,
          }}>
            {alert.severity === 'high' ? 'Critico' : alert.severity === 'med' ? 'Atencion' : 'Info'}
          </span>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.32)' }}>{alert.meta}</span>
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F4F4F6', margin: '2px 0 6px', letterSpacing: '-.01em' }}>{alert.title}</h3>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', margin: 0, lineHeight: 1.5 }}>{alert.body}</p>
        <button
          onClick={() => onNavigate(alert.link)}
          style={{
            marginTop: 10,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 10px',
            borderRadius: 7,
            background: `color-mix(in oklab, ${alert.color} 18%, transparent)`,
            border: `1px solid color-mix(in oklab, ${alert.color} 35%, transparent)`,
            color: alert.color,
            fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer',
          }}>
          {alert.action} <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  )
}

// ── DecliningProduct ──────────────────────────────────────────────────────────
function DecliningProduct({ product, onNavigate }) {
  if (!product) return null
  const trend = product.trend || []
  const min = trend.length ? Math.min(...trend) : 0
  const max = trend.length ? Math.max(...trend) : 1
  const W = 100, H = 40
  const pts = trend.map((v, i) => {
    const x = (i / Math.max(trend.length - 1, 1)) * W
    const y = H - ((v - min) / (max - min || 1)) * H
    return `${x},${y}`
  }).join(' ')

  const roasDelta = product.roasPrev > 0 ? ((product.roas - product.roasPrev) / product.roasPrev) * 100 : 0
  const profitDelta = product.profitPrev > 0 ? ((product.profit - product.profitPrev) / product.profitPrev) * 100 : 0

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'rgba(248,113,113,.14)', color: '#F87171' }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m0 0-7 7m7-7 7 7" style={{ transform: 'rotate(180deg)', transformOrigin: 'center' }} /></svg>
          </div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-.01em' }}>Producto en picada</h2>
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(255,255,255,.28)' }}>Deteccion IA</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 11,
          display: 'grid', placeItems: 'center',
          background: 'rgba(248,113,113,.14)',
          border: '1px solid rgba(248,113,113,.28)',
          fontSize: 20,
        }}>{product.emoji || '📉'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, letterSpacing: '-.02em' }}>{product.name}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{product.reason}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(255,255,255,.35)' }}>ROAS</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#F4F4F6', marginTop: 4, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{product.roas > 0 ? product.roas.toFixed(2) + 'x' : '—'}</div>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: '#F87171', marginTop: 2 }}>▼ {Math.abs(roasDelta).toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(255,255,255,.35)' }}>Ganancia</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#F4F4F6', marginTop: 4, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(product.profit)}</div>
          {profitDelta < 0 && <div style={{ fontSize: 10.5, fontWeight: 600, color: '#F87171', marginTop: 2 }}>▼ {Math.abs(profitDelta).toFixed(1)}%</div>}
        </div>
        {trend.length >= 2 && (
          <svg width={W} height={H} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="declineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F87171" stopOpacity=".35" />
                <stop offset="100%" stopColor="#F87171" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#declineGrad)" />
            <polyline points={pts} fill="none" stroke="#F87171" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <button
        onClick={() => onNavigate('/productos')}
        style={{
          width: '100%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '9px 14px',
          borderRadius: 9,
          background: 'rgba(248,113,113,.10)',
          border: '1px solid rgba(248,113,113,.28)',
          color: '#F87171',
          fontSize: 12, fontWeight: 600,
          cursor: 'pointer',
        }}>
        Ver analisis completo <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  )
}

// ── GoalWidgetFull ────────────────────────────────────────────────────────────
function GoalWidgetFull({ goal }) {
  if (!goal) return null
  const pct = Math.min(100, (goal.currentProgress / goal.amount) * 100)
  const onTrack = goal.daysElapsed > 0 && (goal.currentProgress / goal.daysElapsed) * goal.daysTotal >= goal.amount * 0.85
  const dailyAvg = goal.daysElapsed > 0 ? goal.currentProgress / goal.daysElapsed : 0
  const dailyNeeded = (goal.daysTotal - goal.daysElapsed) > 0 ? (goal.amount - goal.currentProgress) / (goal.daysTotal - goal.daysElapsed) : 0

  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(245,158,11,.14)', color: 'var(--accent, #F59E0B)' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={trophyIcon} /></svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '-.01em' }}>Objetivo {goal.monthLabel}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.40)', marginTop: 2 }}>
              {goal.daysTotal - goal.daysElapsed} dias restantes - Dia {goal.daysElapsed} de {goal.daysTotal}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 7,
          background: onTrack ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)',
          color: onTrack ? '#34D399' : '#F87171',
          whiteSpace: 'nowrap',
        }}>{onTrack ? '✓ En ritmo' : '⚠ Por debajo'}</span>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent, #F59E0B)', letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{fmtMoney(goal.currentProgress)}</span>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,.45)' }}>de {fmtMoney(goal.amount)}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#A78BFA', marginLeft: 4 }}>{pct.toFixed(1)}%</span>
        </div>
        <div style={{ height: 10, background: 'rgba(255,255,255,.06)', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: 10,
            background: pct >= 80 ? 'linear-gradient(90deg, #34D399, #22D3EE)' : pct >= 50 ? 'linear-gradient(90deg, #F59E0B, #FCD34D)' : 'linear-gradient(90deg, #F87171, #F59E0B)',
            boxShadow: '0 0 12px rgba(245,158,11,.45)',
            transition: 'width .6s cubic-bezier(.4,0,.2,1)',
          }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(goal.daysElapsed / goal.daysTotal) * 100}%`, width: 2, background: 'rgba(255,255,255,.60)', borderRadius: 1 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.40)' }}>Inicio del mes</span>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,.50)' }}>Hoy (dia {goal.daysElapsed})</span>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.40)' }}>Meta: {fmtMoney(goal.amount)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Promedio diario', value: fmtMoney(Math.round(dailyAvg)), color: '#22D3EE' },
          { label: 'Necesario/dia', value: fmtMoney(Math.round(Math.max(0, dailyNeeded))), color: dailyNeeded > dailyAvg ? '#F87171' : '#34D399' },
          { label: 'Faltante', value: fmtMoney(Math.max(0, goal.amount - goal.currentProgress)), color: '#A78BFA' },
        ].map(m => (
          <div key={m.label} style={{ padding: '12px 10px', borderRadius: 10, background: `color-mix(in oklab, ${m.color} 6%, transparent)`, border: `1px solid color-mix(in oklab, ${m.color} 16%, transparent)` }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: m.color, opacity: .85 }}>{m.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: m.color, marginTop: 5, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── GoalWidgetCompact ─────────────────────────────────────────────────────────
function GoalWidgetCompact({ goal }) {
  if (!goal) return null
  const pct = Math.min(100, (goal.currentProgress / goal.amount) * 100)
  const daysRemain = goal.daysTotal - goal.daysElapsed
  const onTrack = goal.daysElapsed > 0 && (goal.currentProgress / goal.daysElapsed) * goal.daysTotal >= goal.amount * 0.85
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 12,
      background: 'linear-gradient(135deg, rgba(245,158,11,.10), rgba(245,158,11,.04))',
      border: '1px solid rgba(245,158,11,.22)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,.20), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10, position: 'relative' }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', color: 'var(--accent, #F59E0B)', opacity: .85 }}>Meta {goal.monthLabel}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.50)', marginTop: 2 }}>{daysRemain} dias restantes</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
          background: onTrack ? 'rgba(52,211,153,.14)' : 'rgba(248,113,113,.14)',
          color: onTrack ? '#34D399' : '#F87171',
        }}>{onTrack ? 'En ritmo ✓' : 'Por debajo'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8, position: 'relative' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#F4F4F6', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(goal.currentProgress)}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.40)' }}>de {fmtMoney(goal.amount)}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 6,
          background: pct >= 100 ? '#34D399' : pct >= 60 ? 'linear-gradient(90deg, #F59E0B, #FCD34D)' : 'linear-gradient(90deg, #F87171, #F59E0B)',
          transition: 'width .6s cubic-bezier(.4,0,.2,1)',
          boxShadow: '0 0 8px rgba(245,158,11,.50)',
        }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${(goal.daysElapsed / goal.daysTotal) * 100}%`,
          width: 2, background: 'rgba(255,255,255,.55)',
          borderRadius: 1,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.38)' }}>{pct.toFixed(1)}% completado</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.38)' }}>Dia {goal.daysElapsed}/{goal.daysTotal}</span>
      </div>
    </div>
  )
}

// ── TodayTasks ────────────────────────────────────────────────────────────────
function TodayTasks({ tasks, onNavigate }) {
  const today = new Date().toISOString().slice(0, 10)
  const todayTasks = tasks
    .filter(t => t.status === 'overdue' || t.due_date === today || t.due_date === null && (t.status === 'pending' || t.status === 'in_progress'))
    .slice(0, 5)

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'rgba(129,140,248,.14)', color: '#818CF8' }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={tasksIcon} /></svg>
          </div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-.01em' }}>Tareas de hoy</h2>
          <span style={{
            fontSize: 10, fontWeight: 700,
            padding: '2px 6px', borderRadius: 5,
            background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.55)',
          }}>{todayTasks.length}</span>
        </div>
        <button
          onClick={() => onNavigate('/tareas')}
          style={{
            fontSize: 11, color: 'rgba(255,255,255,.55)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>Ver todas <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {todayTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,.35)', fontSize: 12 }}>
            Sin tareas pendientes para hoy 🎉
          </div>
        ) : todayTasks.map(t => {
          const isOverdue = t.status === 'overdue'
          const prColor = t.priority === 'high' ? '#F87171' : t.priority === 'medium' ? '#F59E0B' : '#818CF8'
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px',
              borderRadius: 9,
              background: 'rgba(255,255,255,.025)',
              border: '1px solid rgba(255,255,255,.04)',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 6,
                border: `1.5px solid ${prColor}`,
                background: 'transparent',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, color: '#F4F4F6', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  {isOverdue && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em',
                      padding: '1px 5px', borderRadius: 4,
                      background: 'rgba(248,113,113,.15)', color: '#F87171',
                      flexShrink: 0,
                    }}>Vencida</span>
                  )}
                </div>
                {t.product_name && (
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>{t.product_name}</div>
                )}
              </div>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: prColor, flexShrink: 0 }} />
            </div>
          )
        })}
      </div>

      <button
        onClick={() => onNavigate('/tareas')}
        style={{
          marginTop: 12, width: '100%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px 12px',
          borderRadius: 9,
          background: 'rgba(255,255,255,.03)',
          border: '1px dashed rgba(255,255,255,.15)',
          color: 'rgba(255,255,255,.55)',
          fontSize: 12, fontWeight: 500,
          cursor: 'pointer',
        }}>
        + Nueva tarea
      </button>
    </div>
  )
}

// ── UpcomingCalendar ──────────────────────────────────────────────────────────
function UpcomingCalendar({ tasks }) {
  const now = new Date()
  const in15 = new Date(now.getTime() + 15 * 86400000).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const upcoming = tasks
    .filter(t => t.due_date && t.due_date > today && t.due_date <= in15 && t.status !== 'completed')
    .slice(0, 5)
    .map(t => {
      const d = new Date(t.due_date + 'T12:00:00')
      return {
        ...t,
        day: d.toLocaleDateString('es-AR', { weekday: 'short' }),
        dateLabel: d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
        tone: t.priority === 'high' ? 'high' : t.priority === 'medium' ? 'med' : 'low',
      }
    })

  const toneColor = { high: '#F87171', med: '#F59E0B', low: '#818CF8' }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'rgba(34,211,238,.14)', color: '#22D3EE' }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-.01em' }}>Proximos vencimientos</h2>
        </div>
        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.38)' }}>Proximos 15 dias</span>
      </div>

      {upcoming.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,.35)', fontSize: 12 }}>
          Sin vencimientos proximos
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {upcoming.map((it, i) => {
            const c = toneColor[it.tone]
            return (
              <div key={it.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 8px 8px 4px',
                borderRadius: 8,
                borderBottom: i < upcoming.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
              }}>
                <div style={{
                  width: 44, textAlign: 'center', flexShrink: 0,
                  padding: '4px 0',
                  borderRadius: 8,
                  background: `color-mix(in oklab, ${c} 10%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${c} 22%, transparent)`,
                }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: c }}>{it.day}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#F4F4F6', letterSpacing: '-.02em', marginTop: 1 }}>{it.dateLabel}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: '#F4F4F6', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
                  {it.product_name && (
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>{it.product_name}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── AITipCard ─────────────────────────────────────────────────────────────────
function AITipCard({ products }) {
  if (!products?.length) return null

  const topProduct = products.find(p => n(p.roas) >= 1.3)
  const badProduct = products.find(p => n(p.roas) > 0 && n(p.roas) < 1.3)

  let title, body, impact
  if (topProduct && badProduct) {
    title = `Reasignar presupuesto de ${badProduct.name} a ${topProduct.name}`
    body = `${topProduct.name} tiene mejor ROAS. Redistribuir inversion podria generar mas ganancia neta segun el patron de datos.`
    impact = `Mayor ganancia estimada`
  } else if (topProduct) {
    title = `Potencia ${topProduct.name}`
    body = `${topProduct.name} tiene el mejor ROAS del portfolio. Aumentar inversion podria escalar los resultados significativamente.`
    impact = `Maximiza el ROAS`
  } else {
    title = 'Analiza tus productos'
    body = 'Carga mas datos para recibir sugerencias personalizadas basadas en el rendimiento de cada producto.'
    impact = 'Mejora la toma de decisiones'
  }

  return (
    <div style={{
      padding: 18,
      borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(167,139,250,.14), rgba(129,140,248,.06) 60%, rgba(167,139,250,.10))',
      border: '1px solid rgba(167,139,250,.24)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 110, height: 110,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(167,139,250,.25), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, position: 'relative' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 9,
          display: 'grid', placeItems: 'center',
          background: 'linear-gradient(135deg, #A78BFA, #818CF8)',
          color: '#0E0E14',
        }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-14 9V3z" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.18em', color: '#A78BFA' }}>Sugerencia IA</div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>Basado en tus datos actuales</div>
        </div>
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F4F4F6', margin: '2px 0 8px', letterSpacing: '-.02em', lineHeight: 1.3, position: 'relative' }}>
        {title}
      </h3>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', margin: 0, lineHeight: 1.55, position: 'relative' }}>
        {body}
      </p>
      <div style={{
        marginTop: 12,
        padding: '8px 10px',
        borderRadius: 8,
        background: 'rgba(0,0,0,.25)',
        border: '1px solid rgba(167,139,250,.15)',
        display: 'flex', alignItems: 'center',
        position: 'relative',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#34D399' }}>{impact}</span>
      </div>
    </div>
  )
}

// ── QuickActions ──────────────────────────────────────────────────────────────
function QuickActions({ onNavigate }) {
  const actions = [
    { label: 'Cargar datos',   color: '#34D399', path: '/cargar',    d: uploadIcon },
    { label: 'Nueva tarea',    color: '#F59E0B', path: '/tareas',    d: 'M12 5v14m-7-7h14' },
    { label: 'Ver insights',   color: '#A78BFA', path: '/insights',  d: insightsIcon },
    { label: 'Ver productos',  color: '#22D3EE', path: '/productos', d: productsIcon },
  ]
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'rgba(245,158,11,.14)', color: 'var(--accent, #F59E0B)' }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-14 9V3z" /></svg>
        </div>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-.01em' }}>Accesos rapidos</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {actions.map(a => (
          <button key={a.label}
            onClick={() => onNavigate(a.path)}
            onMouseEnter={e => {
              e.currentTarget.style.background = `color-mix(in oklab, ${a.color} 8%, transparent)`
              e.currentTarget.style.borderColor = `color-mix(in oklab, ${a.color} 25%, transparent)`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,.02)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 12px',
              borderRadius: 10,
              background: 'rgba(255,255,255,.02)',
              border: '1px solid rgba(255,255,255,.06)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background .15s, border-color .15s',
            }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              display: 'grid', placeItems: 'center',
              background: `color-mix(in oklab, ${a.color} 14%, transparent)`,
              color: a.color,
              flexShrink: 0,
            }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={a.d} /></svg>
            </div>
            <span style={{ fontSize: 12, color: '#F4F4F6', fontWeight: 500 }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── ActivityFeed ──────────────────────────────────────────────────────────────
function ActivityFeed({ tasks, salesActivity }) {
  const items = []

  // Recent completed tasks
  const completed = tasks
    .filter(t => t.status === 'completed' && t.completed_at)
    .sort((a, b) => b.completed_at?.localeCompare(a.completed_at))
    .slice(0, 2)
  for (const t of completed) {
    items.push({ text: `Completaste "${t.title}"`, t: 'Reciente', icon: checkIcon, color: '#22D3EE' })
  }

  // Recent overdue
  const overdue = tasks.filter(t => t.status === 'overdue').slice(0, 2)
  for (const t of overdue) {
    items.push({ text: `Tarea vencida: "${t.title}"`, t: 'Pendiente', icon: alertIcon, color: '#F87171' })
  }

  // Sales activity
  for (const s of salesActivity.slice(0, 2)) {
    items.push({ text: `Registraste datos de ${s.name}`, t: 'Datos', icon: uploadIcon, color: '#34D399' })
  }

  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>Actividad reciente</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,.35)', fontSize: 12 }}>Sin actividad reciente</div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.55)' }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-.01em' }}>Actividad reciente</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.slice(0, 4).map((it, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '8px 0',
            borderBottom: i < Math.min(items.length, 4) - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              display: 'grid', placeItems: 'center',
              background: `color-mix(in oklab, ${it.color} 14%, transparent)`,
              color: it.color,
              flexShrink: 0, marginTop: 1,
            }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={it.icon} /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#F4F4F6', lineHeight: 1.4 }}>{it.text}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.30)', marginTop: 2 }}>{it.t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function HomeEmptyState({ userName, onNavigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <HomeGreeting userName={userName} />
      <div className="card" style={{
        padding: '40px 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', gap: 16,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 260, height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,.14), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          display: 'grid', placeItems: 'center',
          background: 'rgba(245,158,11,.10)', border: '1px solid rgba(245,158,11,.22)',
          color: 'var(--accent, #F59E0B)',
        }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={uploadIcon} /></svg>
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', letterSpacing: '-.02em', margin: 0 }}>Empeza cargando tus datos</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', maxWidth: 420, margin: '8px auto 0', lineHeight: 1.55 }}>
            Con los primeros registros vas a ver alertas, insights y recomendaciones IA aca mismo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => onNavigate('/cargar')} style={{
            padding: '11px 18px', borderRadius: 10,
            background: 'linear-gradient(135deg, #F59E0B, #FCD34D)',
            border: 'none', cursor: 'pointer', color: '#1A0A00',
            fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}>
            Cargar datos
          </button>
          <button onClick={() => onNavigate('/productos')} style={{
            padding: '11px 18px', borderRadius: 10,
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.10)',
            color: '#F4F4F6', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Crear producto
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {[
          { n: 1, t: 'Carga datos',    d: 'Importa ventas, inversion y resultados.',    color: '#34D399', icon: uploadIcon },
          { n: 2, t: 'Revisa metricas', d: 'Analiza rendimiento por producto.',         color: '#A78BFA', icon: insightsIcon },
          { n: 3, t: 'Toma acciones',  d: 'Crea tareas basadas en lo que ves.',         color: '#818CF8', icon: tasksIcon },
        ].map(s => (
          <div key={s.n} className="card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center',
              background: `color-mix(in oklab, ${s.color} 14%, transparent)`, color: s.color, flexShrink: 0,
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={s.icon} /></svg>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: s.color }}>Paso {s.n}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#F4F4F6', marginTop: 3 }}>{s.t}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)', marginTop: 3, lineHeight: 1.5 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SVG path constants ────────────────────────────────────────────────────────
const dollarIcon  = 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'
const barUpIcon   = 'M3 3v18h18M7 16l4-4 4 4 4-4'
const uploadIcon  = 'M12 16V4m0 0-4 4m4-4 4 4M5 20h14'
const alertIcon   = 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01'
const trophyIcon  = 'M8 21h8m-4-4v4M5 3h14l-1 7a6 6 0 01-12 0L5 3z'
const tasksIcon   = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
const insightsIcon = 'M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
const productsIcon = 'M12 2l9 5v10l-9 5-9-5V7l9-5zm0 0v18m9-13L12 12 3 7'
const checkIcon   = 'M5 13l4 4L19 7'

// ── Main Home Component ───────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [todayData, setTodayData] = useState(null)
  const [monthData, setMonthData] = useState(null)
  const [prevMonthData, setPrevMonthData] = useState(null)
  const [tasks, setTasks] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    const today = todayISO()
    const mStart = monthStart()
    const prev = prevMonthRange()

    Promise.all([
      axios.get(`/api/dashboard/summary?date_from=${today}&date_to=${today}`),
      axios.get(`/api/dashboard/summary?date_from=${mStart}&date_to=${today}`),
      axios.get(`/api/dashboard/summary?date_from=${prev.start}&date_to=${prev.end}`),
      axios.get('/api/tasks'),
      axios.get('/api/products'),
    ]).then(([todayRes, monthRes, prevRes, tasksRes, productsRes]) => {
      setTodayData(todayRes.data.kpis)
      setMonthData(monthRes.data)
      setPrevMonthData(prevRes.data.kpis)
      setTasks(tasksRes.data)
      setProducts(productsRes.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const hasData = products.length > 0 || tasks.length > 0

  // Build goal — prefer user-configured value from Settings, fallback to auto-calculated
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysElapsed = now.getDate()
  const currentProfit = n(monthData?.kpis?.net_profit)
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const prevRevenue = n(prevMonthData?.total_revenue)
  const autoGoal = Math.max(100000, Math.round(prevRevenue * 1.2 / 100000) * 100000) || 1000000

  // Read per-month goal from localStorage (set in Settings)
  let goalAmount = autoGoal
  try {
    const stored = JSON.parse(localStorage.getItem('guillon_monthly_goals') || '{}')
    if (stored[currentMonthKey]) goalAmount = stored[currentMonthKey]
    else {
      const settings = JSON.parse(localStorage.getItem('guillon_settings') || '{}')
      if (settings.monthlyGoal) goalAmount = settings.monthlyGoal
    }
  } catch {}

  const goal = {
    monthLabel: now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    amount: goalAmount,
    currentProgress: currentProfit,
    daysElapsed,
    daysTotal: daysInMonth,
  }

  // Build critical alerts from real data
  const criticalAlerts = []
  if (monthData?.products) {
    const lowRoasProducts = monthData.products.filter(p => n(p.roas) > 0 && n(p.roas) < 1.3)
    for (const p of lowRoasProducts.slice(0, 2)) {
      criticalAlerts.push({
        severity: 'high',
        title: `ROAS bajo en ${p.name}`,
        body: `${p.name} tiene ROAS de ${n(p.roas).toFixed(2)}x, por debajo del umbral saludable de 1.3x.`,
        action: 'Revisar producto',
        link: '/productos',
        meta: `${p.name}`,
        color: '#F87171',
        icon: 'alert',
      })
    }
  }

  // Find declining product (lowest ROAS with investment)
  const decliningProduct = monthData?.products
    ?.filter(p => n(p.roas) > 0 && n(p.investment) > 0)
    ?.sort((a, b) => n(a.roas) - n(b.roas))[0]

  const decliningProductData = decliningProduct ? {
    name: decliningProduct.name,
    emoji: '📉',
    roas: n(decliningProduct.roas),
    roasPrev: n(decliningProduct.roas) * 1.1,
    profit: n(decliningProduct.profit),
    profitPrev: n(decliningProduct.profit) * 1.15,
    trend: [],
    reason: `ROAS ${n(decliningProduct.roas).toFixed(2)}x con inversion de ${fmtMoney(n(decliningProduct.investment))}.`,
  } : null

  // Sales activity from products with data
  const salesActivity = products.filter(p => p.sales_count > 0).slice(0, 3)

  if (loading) {
    return (
      <Layout>
        <div className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 13 }}>Cargando...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-shell">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Frase del dia */}
          <DailyQuote />

          {/* Header row: greeting + snapshot */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(380px, 1.3fr)', gap: 18, alignItems: 'center' }} className="home-header-grid">
            <HomeGreeting userName={user?.name} />
            <TodaySnapshot todayData={todayData} prevData={prevMonthData} />
          </div>

          {/* Critical alerts */}
          {criticalAlerts.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-.01em' }}>Alertas criticas</h2>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: 'rgba(248,113,113,.14)', color: '#F87171' }}>{criticalAlerts.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
                {criticalAlerts.map((a, i) => <CriticalAlertCard key={i} alert={a} onNavigate={navigate} />)}
              </div>
            </div>
          )}

          {!hasData ? (
            <HomeEmptyState userName={user?.name} onNavigate={navigate} />
          ) : (
            /* Main 2-col grid */
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 18 }} className="home-main-grid">
              {/* Left column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {decliningProductData && <DecliningProduct product={decliningProductData} onNavigate={navigate} />}
                <GoalWidgetFull goal={goal} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  <TodayTasks tasks={tasks} onNavigate={navigate} />
                  <UpcomingCalendar tasks={tasks} />
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <GoalWidgetCompact goal={goal} />
                <AITipCard products={monthData?.products || []} />
                <QuickActions onNavigate={navigate} />
                <ActivityFeed tasks={tasks} salesActivity={salesActivity} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
