import { useState, useMemo } from 'react'

export const PERIODS = [
  { key: '2d',      label: '2 días' },
  { key: '7d',      label: '7 días' },
  { key: '15d',     label: '15 días' },
  { key: '30d',     label: '30 días' },
  { key: '3m',      label: '3 meses' },
  { key: 'year',    label: 'Este año' },
  { key: 'month',   label: 'Por mes' },
  { key: 'custom',  label: 'Personalizado' },
]

function fmt(d) {
  return d.toISOString().slice(0, 10)
}

function computeDates(key, customFrom, customTo, selectedMonth) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = (n) => {
    const from = new Date(today)
    from.setDate(from.getDate() - (n - 1))
    return { date_from: fmt(from), date_to: fmt(today) }
  }

  switch (key) {
    case '2d':    return days(2)
    case '7d':    return days(7)
    case '15d':   return days(15)
    case '30d':   return days(30)
    case '3m': {
      const from = new Date(today)
      from.setMonth(from.getMonth() - 3)
      return { date_from: fmt(from), date_to: fmt(today) }
    }
    case 'year': {
      return { date_from: `${today.getFullYear()}-01-01`, date_to: fmt(today) }
    }
    case 'month': {
      const [y, m] = (selectedMonth || fmt(today).slice(0, 7)).split('-')
      const from = `${y}-${m}-01`
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
      return { date_from: from, date_to: `${y}-${m}-${String(lastDay).padStart(2, '0')}` }
    }
    case 'custom':
      return { date_from: customFrom || fmt(today), date_to: customTo || fmt(today) }
    default:
      return days(7)
  }
}

export function usePeriod() {
  const [period, setPeriod] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))

  const { date_from, date_to } = useMemo(
    () => computeDates(period, customFrom, customTo, selectedMonth),
    [period, customFrom, customTo, selectedMonth]
  )

  return {
    period, setPeriod,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    selectedMonth, setSelectedMonth,
    date_from, date_to,
  }
}
