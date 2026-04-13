import { createContext, useContext, useState, useCallback } from 'react'

const DateRangeContext = createContext(null)

function fmt(d) { return d.toISOString().slice(0, 10) }

function getPreset(key) {
  const today = new Date()
  switch (key) {
    case 'today':    return { from: fmt(today), to: fmt(today), label: 'Hoy' }
    case 'yesterday': {
      const d = new Date(today); d.setDate(d.getDate() - 1)
      return { from: fmt(d), to: fmt(d), label: 'Ayer' }
    }
    case '7d': {
      const d = new Date(today); d.setDate(d.getDate() - 6)
      return { from: fmt(d), to: fmt(today), label: 'Últimos 7 días' }
    }
    case '14d': {
      const d = new Date(today); d.setDate(d.getDate() - 13)
      return { from: fmt(d), to: fmt(today), label: 'Últimos 14 días' }
    }
    case '28d': {
      const d = new Date(today); d.setDate(d.getDate() - 27)
      return { from: fmt(d), to: fmt(today), label: 'Últimos 28 días' }
    }
    case '30d': {
      const d = new Date(today); d.setDate(d.getDate() - 29)
      return { from: fmt(d), to: fmt(today), label: 'Últimos 30 días' }
    }
    case 'this_week': {
      const day = today.getDay() || 7
      const mon = new Date(today); mon.setDate(today.getDate() - day + 1)
      return { from: fmt(mon), to: fmt(today), label: 'Esta semana' }
    }
    case 'last_week': {
      const day = today.getDay() || 7
      const mon = new Date(today); mon.setDate(today.getDate() - day - 6)
      const sun = new Date(today); sun.setDate(today.getDate() - day)
      return { from: fmt(mon), to: fmt(sun), label: 'Semana pasada' }
    }
    case 'this_month': {
      const d = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: fmt(d), to: fmt(today), label: 'Este mes' }
    }
    case 'last_month': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const last  = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: fmt(first), to: fmt(last), label: 'Mes pasado' }
    }
    case '3m': {
      const d = new Date(today); d.setMonth(d.getMonth() - 3)
      return { from: fmt(d), to: fmt(today), label: 'Últimos 3 meses' }
    }
    case 'this_year': {
      const d = new Date(today.getFullYear(), 0, 1)
      return { from: fmt(d), to: fmt(today), label: 'Este año' }
    }
    case 'all': return { from: '2020-01-01', to: fmt(today), label: 'Máximo' }
    default: return getPreset('30d')
  }
}

export const PRESETS = [
  { key: 'today',      label: 'Hoy' },
  { key: 'yesterday',  label: 'Ayer' },
  { key: '7d',         label: 'Últimos 7 días' },
  { key: '14d',        label: 'Últimos 14 días' },
  { key: '28d',        label: 'Últimos 28 días' },
  { key: '30d',        label: 'Últimos 30 días' },
  { key: 'this_week',  label: 'Esta semana' },
  { key: 'last_week',  label: 'Semana pasada' },
  { key: 'this_month', label: 'Este mes' },
  { key: 'last_month', label: 'Mes pasado' },
  { key: '3m',         label: 'Últimos 3 meses' },
  { key: 'this_year',  label: 'Este año' },
  { key: 'all',        label: 'Máximo' },
]

export function DateRangeProvider({ children }) {
  const initial = getPreset('30d')
  const [dateFrom, setDateFrom] = useState(initial.from)
  const [dateTo,   setDateTo]   = useState(initial.to)
  const [label,    setLabel]    = useState(initial.label)

  const applyPreset = useCallback((key) => {
    const p = getPreset(key)
    setDateFrom(p.from)
    setDateTo(p.to)
    setLabel(p.label)
  }, [])

  const applyCustom = useCallback((from, to) => {
    setDateFrom(from)
    setDateTo(to)
    const fmtDisplay = iso => {
      const [y, m, d] = iso.split('-')
      return `${d}/${m}/${y.slice(2)}`
    }
    setLabel(`${fmtDisplay(from)} – ${fmtDisplay(to)}`)
  }, [])

  return (
    <DateRangeContext.Provider value={{ dateFrom, dateTo, label, applyPreset, applyCustom }}>
      {children}
    </DateRangeContext.Provider>
  )
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext)
  if (!ctx) throw new Error('useDateRange dentro de DateRangeProvider')
  return ctx
}
