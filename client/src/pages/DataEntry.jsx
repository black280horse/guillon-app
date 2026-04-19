import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import Layout from '../components/Layout'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeNumber(raw) {
  if (raw == null) return null

  let value = String(raw).trim()
    .replace(/\$/g, '')
    .replace(/\s+/g, '')

  if (!value) return null

  const hasComma = value.includes(',')
  const hasDot = value.includes('.')

  if (hasComma && hasDot) {
    const lastComma = value.lastIndexOf(',')
    const lastDot = value.lastIndexOf('.')
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ','
    value = value.split(thousandsSeparator).join('')
    if (decimalSeparator === ',') value = value.replace(',', '.')
  } else if (hasComma) {
    const pieces = value.split(',')
    value = pieces.length === 2 && pieces[1].length <= 2
      ? pieces[0].replace(/,/g, '') + '.' + pieces[1]
      : value.replace(/,/g, '')
  } else if (hasDot) {
    const pieces = value.split('.')
    value = pieces.length === 2 && pieces[1].length <= 2
      ? value
      : value.replace(/\./g, '')
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeDate(raw) {
  if (!raw) return null

  const cleaned = String(raw).trim().replace(/[.,;]$/, '')

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned
  }

  const parts = cleaned.split(/[\/\-.]/).map(part => part.trim()).filter(Boolean)
  if (parts.length !== 3) return null

  if (parts[0].length === 4) {
    const [year, month, day] = parts
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  let [day, month, year] = parts
  if (year.length === 2) year = `20${year}`

  if (year.length !== 4) return null
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function findDateInLine(line) {
  const inlineDate = line.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/)
  return inlineDate ? normalizeDate(inlineDate[1]) : null
}

// ─── Keyword classifiers ───────────────────────────────────────────────────────
// Revenue labels: ventas, ingresos, revenue
const REVENUE_RX = /^(?:ventas?|ingresos?|revenue)$/i
// Investment labels: inversion, inversion ads, ads inversion, investment, ads
// NOTE: uses anchors (^ $) so "NOVA ADS" does NOT match
const INVESTMENT_RX = /^(?:inversion(?:\s*ads)?|ads\s*inversion|investment|ads)$/i
// Expense category names: common cost headings that are NOT product names
const EXPENSE_NAME_RX = /^(?:empleados?|sueldos?|salarios?|alquiler|arriendo|luz|agua|internet|tel[eé]fonos?|publicidad|marketing|comisiones?|varios|otros?\s*gastos?|impuestos?|seguros?|reparaci[oó]n|mantenimiento|fletes?|env[ií]os?|log[ií]stica|insumos?|materiales?|servicios?)$/i

function isRevenueKey(k)    { return REVENUE_RX.test(k.trim()) }
function isInvestmentKey(k) { return INVESTMENT_RX.test(k.trim()) }
function isExpenseKey(k)    { return EXPENSE_NAME_RX.test(k.trim()) }
function isMetricKey(k)     { return isRevenueKey(k) || isInvestmentKey(k) }

// Pure standalone date line: "5/4/26", "2026-04-05", "fecha: 5/4/26"
function isStandaloneDateLine(line) {
  return /^(?:fecha\s*:?\s*)?\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/i.test(line)
      || /^\d{4}-\d{2}-\d{2}$/.test(line)
}

function finalizeRecord(record, fallbackDate) {
  if (!record?.product_name) return null

  const revenue    = Number(record.revenue    ?? 0)
  const investment = Number(record.investment ?? 0)
  if (revenue === 0 && investment === 0) return null

  return {
    product_name: record.product_name.trim(),
    date:         record.date || fallbackDate,
    revenue,
    investment,
  }
}

// ─── Main parser ───────────────────────────────────────────────────────────────
function parseText(text) {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const records = []
  let currentDate = todayIso()   // active date — updated on every standalone date line
  let current     = null          // product block being assembled
  let inExpenses  = false

  function pushCurrent() {
    if (!current) return
    const r = finalizeRecord(current, currentDate)
    if (r) records.push(r)
    current = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line     = lines[i]
    const nextLine = lines[i + 1] || ''

    // ── 1. Standalone date line anywhere in text ────────────────────
    //    Supports: "5/4/26", "05/04/2026", "2026-04-05", "Fecha: 5/4/26"
    if (isStandaloneDateLine(line)) {
      const stripped = line.replace(/^fecha\s*:?\s*/i, '')
      const detected = normalizeDate(stripped) || normalizeDate(line)
      if (detected) {
        pushCurrent()           // save whatever was open
        currentDate = detected  // ← NOW tracks per-block date
        inExpenses  = false
        continue
      }
    }

    // ── 2. Gastos section header: "Gastos" / "Gastos:" ─────────────
    if (/^gastos?\s*:?\s*$/i.test(line)) {
      pushCurrent()
      inExpenses = true
      continue
    }

    // ── 3. Explicit "Producto: NAME" ────────────────────────────────
    const prodMatch = line.match(/^producto\s*:?\s*(.+)$/i)
    if (prodMatch) {
      pushCurrent()
      inExpenses = false
      current = {
        product_name: prodMatch[1].trim(),
        date:         currentDate,
        revenue:      0,
        investment:   0,
      }
      continue
    }

    // ── 4. Lines with colon: "KEY : VALUE" or "KEY: VALUE" ─────────
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const rawKey = line.slice(0, colonIdx).trim()
      const rawVal = line.slice(colonIdx + 1).trim()
      const numVal = normalizeNumber(rawVal)

      // 4a. Known revenue label  →  update current product
      if (isRevenueKey(rawKey) && numVal != null) {
        if (!current) current = { product_name: null, date: currentDate, revenue: 0, investment: 0 }
        current.revenue = numVal
        continue
      }

      // 4b. Known investment label  →  update current product
      //     Uses strict anchored regex so "NOVA ADS" won't match "ads"
      if (isInvestmentKey(rawKey) && numVal != null) {
        if (!current) current = { product_name: null, date: currentDate, revenue: 0, investment: 0 }
        current.investment = numVal
        continue
      }

      // 4c. Numeric value and NOT a metric key
      if (numVal != null) {
        if (inExpenses || isExpenseKey(rawKey)) {
          // Known expense keyword or inside Gastos block → save as expense
          pushCurrent()
          records.push({
            product_name: 'Gastos generales',
            date:         currentDate,
            revenue:      0,
            investment:   numVal,
          })
          continue
        }

        // Inline product  "PRODUCT_NAME: revenue_value"
        // e.g. "Pack IA: 370000", "18 MINI : 45500", "NOVA ADS: 24000"
        pushCurrent()
        inExpenses = false
        const inline = finalizeRecord(
          { product_name: rawKey, date: currentDate, revenue: numVal, investment: 0 },
          currentDate
        )
        if (inline) records.push(inline)
        continue
      }

      // 4d. "Fecha: DD/MM/YY" in mid-text (non-standalone form)
      if (/^fecha$/i.test(rawKey)) {
        const d = normalizeDate(rawVal)
        if (d) {
          pushCurrent()
          currentDate = d
          inExpenses  = false
          continue
        }
      }

      continue // unknown "KEY: string" — skip
    }

    // ── 5. Bare line (no colon) ─────────────────────────────────────
    if (/^\$?[\d.,\s]+$/.test(line)) continue  // pure number — skip
    if (isMetricKey(line))           continue  // lone metric keyword — skip
    if (/^gastos?$/i.test(line))     continue  // already handled above

    // Treat as product name if the NEXT line carries a metric
    const nextHasMetric = /(?:ventas?|ingresos?|revenue|inversion(?:\s*ads)?|investment|ads)\s*:/i.test(nextLine)
    if (nextHasMetric) {
      pushCurrent()
      inExpenses = false
      current = {
        product_name: line.replace(/[,;:]+$/, '').trim(),
        date:         currentDate,
        revenue:      0,
        investment:   0,
      }
    }
    // else: orphan label without following data — skip silently
  }

  pushCurrent()
  return records
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(header => header.trim().toLowerCase().replace(/[" ]/g, ''))
  const columns = {
    product_name: ['producto', 'product', 'product_name', 'nombre'],
    date: ['fecha', 'date'],
    revenue: ['ingresos', 'revenue', 'ventas', 'ingreso'],
    investment: ['inversion', 'inversionads', 'investment'],
  }

  function findColumn(key) {
    return columns[key].findIndex ? null : null
  }

  function resolveIndex(key) {
    for (const alias of columns[key]) {
      const index = headers.indexOf(alias)
      if (index !== -1) return index
    }
    return -1
  }

  const indexes = {
    product_name: resolveIndex('product_name'),
    date: resolveIndex('date'),
    revenue: resolveIndex('revenue'),
    investment: resolveIndex('investment'),
  }

  return lines
    .slice(1)
    .map(line => {
      const cells = line.split(',').map(cell => cell.trim().replace(/"/g, ''))
      const product_name = indexes.product_name >= 0 ? cells[indexes.product_name] : ''
      const date = indexes.date >= 0 ? normalizeDate(cells[indexes.date]) : todayIso()
      const revenue = indexes.revenue >= 0 ? normalizeNumber(cells[indexes.revenue]) ?? 0 : 0
      const investment = indexes.investment >= 0 ? normalizeNumber(cells[indexes.investment]) ?? 0 : 0

      return {
        product_name,
        date: date || todayIso(),
        revenue,
        investment,
      }
    })
    .filter(row => row.product_name && row.date)
}

function fmt(amount) {
  return `$${Number(amount ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
}

function ConfirmCard({ pending, onConfirm, onEdit, loading }) {
  const totals = pending.records.reduce((acc, record) => {
    acc.revenue += Number(record.revenue ?? 0)
    acc.investment += Number(record.investment ?? 0)
    return acc
  }, { revenue: 0, investment: 0 })

  const profit = totals.revenue - totals.investment

  // Support multiple dates: show unique dates sorted
  const uniqueDates = [...new Set(pending.records.map(r => r.date))].sort()
  const dateLabel = uniqueDates.length === 1
    ? uniqueDates[0]
    : `${uniqueDates.length} fechas`

  return (
    <div className="animate-fade-up">
      <div className="card border-l-2 border-l-[#F59E0B] p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[#F59E0B] text-sm font-semibold">Revisar antes de importar</p>
            <p className="text-[#8ea0bc] text-xs mt-1">{pending.records.length} registro{pending.records.length === 1 ? '' : 's'} detectado{pending.records.length === 1 ? '' : 's'}</p>
          </div>
          <div className="rounded-[8px] bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-3 py-1 text-[11px] font-semibold text-[#ffd27d]">
            {dateLabel}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-[#0B0B0E] rounded-[6px] px-3 py-3">
            <p className="text-[#52525b] text-xs mb-0.5">Ingresos totales</p>
            <p className="text-[#10b981] font-bold">{fmt(totals.revenue)}</p>
          </div>
          <div className="bg-[#0B0B0E] rounded-[6px] px-3 py-3">
            <p className="text-[#52525b] text-xs mb-0.5">Inversion total</p>
            <p className="text-[#ef4444] font-bold">{fmt(totals.investment)}</p>
          </div>
          <div className="bg-[#0B0B0E] rounded-[6px] px-3 py-3">
            <p className="text-[#52525b] text-xs mb-0.5">Resultado</p>
            <p className={`font-bold ${profit >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{fmt(profit)}</p>
          </div>
        </div>

        <div className="rounded-[8px] border border-white/8 bg-[#0B0B0E] overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.2fr)_110px_110px] gap-3 px-4 py-3 border-b border-white/8 text-[11px] uppercase tracking-[0.14em] text-[#7d8ca5]">
            <span>Producto</span>
            <span>Ingresos</span>
            <span>Inversion</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {pending.records.map((record, index) => (
              <div key={`${record.product_name}-${index}`} className="grid grid-cols-[minmax(0,1.2fr)_110px_110px] gap-3 px-4 py-3 text-sm border-b border-white/6 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{record.product_name}</p>
                  <p className="text-[#52525b] text-xs mt-1">{record.date}</p>
                </div>
                <span className="text-[#10b981] font-medium">{fmt(record.revenue)}</span>
                <span className="text-[#ef4444] font-medium">{fmt(record.investment)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onEdit}
            disabled={loading}
            className="flex-1 py-2 rounded-[6px] border border-[#2a2a2e] text-[#a1a1aa] text-sm hover:text-white hover:border-[#3a3a3e] transition-colors disabled:opacity-50"
          >
            Editar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-[6px] bg-[#F59E0B] hover:bg-[#E8A020] text-black text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Importando...' : `Confirmar e importar ${pending.records.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChatMessage({ msg }) {
  if (msg.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-xs bg-[#1f1f23] border border-[#2a2a2e] text-white text-sm px-4 py-2.5 rounded-[8px] rounded-tr-sm whitespace-pre-line">
          {msg.text}
        </div>
      </div>
    )
  }

  if (msg.type === 'success') {
    const data = msg.data
    return (
      <div className="flex justify-start">
        <div className="max-w-sm card border-l-2 border-l-[#10b981] px-4 py-3 space-y-2">
          <p className="text-[#10b981] text-sm font-medium">{msg.text}</p>
          {data && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <Kv label="Producto" value={data.product_name} />
              <Kv label="Fecha" value={data.date} />
              <Kv label="Ingresos" value={fmt(data.revenue)} color="text-[#10b981]" />
              <Kv label="Inversion" value={fmt(data.investment)} color="text-[#ef4444]" />
              <Kv label="Ganancia" value={fmt(data.profit)} color="text-[#F59E0B]" />
              <Kv label="ROAS" value={data.roas ? `${data.roas}x` : '-'} />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (msg.type === 'error') {
    return (
      <div className="flex justify-start">
        <div className="max-w-sm card border-l-2 border-l-[#ef4444] px-4 py-3">
          <p className="text-[#ef4444] text-sm whitespace-pre-line">{msg.text}</p>
        </div>
      </div>
    )
  }

  if (msg.type === 'info') {
    return (
      <div className="flex justify-start">
        <div className="max-w-sm card px-4 py-3">
          <p className="text-[#a1a1aa] text-sm whitespace-pre-line">{msg.text}</p>
        </div>
      </div>
    )
  }

  return null
}

function Kv({ label, value, color = 'text-white' }) {
  return (
    <div>
      <span className="text-[#52525b]">{label}: </span>
      <span className={color}>{value}</span>
    </div>
  )
}

function RecentHistory({ history }) {
  if (!history.length) return null

  return (
    <div className="card p-4 space-y-3">
      <p className="text-[#52525b] text-xs font-semibold tracking-widest uppercase">Cargados recientemente</p>
      <div className="space-y-2">
        {history.map((item, index) => (
          <div key={`${item.id ?? item.product_name}-${index}`} className="flex items-center gap-3 text-xs">
            <span className="w-1.5 h-1.5 rounded-[8px] bg-[#10b981] shrink-0" />
            <span className="text-white flex-1 truncate">{item.product_name}</span>
            <span className="text-[#52525b]">{item.date}</span>
            <span className="text-[#10b981] font-medium">{fmt(item.revenue)}</span>
            <span className={item.roas >= 2 ? 'text-[#10b981]' : 'text-[#F59E0B]'}>
              {item.roas ? `${item.roas}x` : '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DataEntry() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [csvRows, setCsvRows] = useState(null)
  const [csvName, setCsvName] = useState('')
  const [pending, setPending] = useState(null)
  const [history, setHistory] = useState([])
  const fileRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    axios.get('/api/sales')
      .then(response => setHistory((response.data ?? []).slice(0, 5)))
      .catch(() => {})
  }, [])

  function addMessage(message) {
    setMessages(current => [...current, message])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function addToHistory(record) {
    setHistory(current => [record, ...current].slice(0, 5))
  }

  async function saveRecord(record) {
    try {
      const response = await axios.post('/api/sales', record)
      return { ok: true, data: response.data }
    } catch (error) {
      return { ok: false, error: error.response?.data?.error || 'Error al guardar' }
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text) return

    addMessage({ type: 'user', text })
    setInput('')

    const records = parseText(text)
    if (!records.length) {
      addMessage({
        type: 'error',
        text: 'No pude detectar registros válidos.\n\nFormatos soportados:\n\n5/4/26\nCurso A: 370000\nProducto B: 430000\nServicio C: 45500\n\n— o con métricas separadas —\n\n5/4/26\nCurso A\nVentas: 370000\nInversion: 45000\n\n— gastos —\n\nGastos:\nEmpleados: 80000',
      })
      return
    }

    setPending({ rawText: text, records })
  }

  async function handleConfirm() {
    if (!pending?.records?.length) return

    setLoading(true)
    let ok = 0
    let fail = 0
    let lastSuccess = null

    for (const record of pending.records) {
      const result = await saveRecord(record)
      if (result.ok) {
        ok += 1
        lastSuccess = result.data
        addToHistory(result.data)
      } else {
        fail += 1
      }
    }

    if (ok > 0 && pending.records.length === 1 && lastSuccess) {
      addMessage({ type: 'success', data: lastSuccess, text: 'Guardado correctamente' })
    } else if (ok > 0) {
      addMessage({
        type: 'success',
        text: `Importacion completada: ${ok} registro${ok === 1 ? '' : 's'} guardado${ok === 1 ? '' : 's'}${fail ? `, ${fail} fallido${fail === 1 ? '' : 's'}` : ''}.`,
      })
    }

    if (ok === 0) {
      addMessage({ type: 'error', text: 'No se pudo guardar ningun registro.' })
    }

    setPending(null)
    setLoading(false)
  }

  function handleEdit() {
    if (!pending) return
    setInput(pending.rawText)
    setPending(null)
  }

  function handleFile(event) {
    const file = event.target.files[0]
    if (!file) return

    setCsvName(file.name)
    const reader = new FileReader()
    reader.onload = loadEvent => {
      const rows = parseCSV(loadEvent.target.result)
      if (!rows.length) {
        addMessage({ type: 'error', text: 'No se pudieron leer filas del CSV. Verifica los encabezados: Producto, Fecha, Ingresos, Inversion.' })
      } else {
        setCsvRows(rows)
      }
    }

    reader.readAsText(file)
    event.target.value = ''
  }

  async function handleImportCSV() {
    if (!csvRows?.length) return

    setLoading(true)
    addMessage({ type: 'info', text: `Importando ${csvRows.length} registros desde ${csvName}...` })

    let ok = 0
    let fail = 0

    for (const row of csvRows) {
      const result = await saveRecord(row)
      if (result.ok) {
        ok += 1
        addToHistory(result.data)
      } else {
        fail += 1
      }
    }

    addMessage({
      type: ok > 0 ? 'success' : 'error',
      text: `Importacion completada: ${ok} guardados${fail > 0 ? `, ${fail} fallidos` : ''}.`,
    })

    setCsvRows(null)
    setCsvName('')
    setLoading(false)
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-3xl mx-auto flex flex-col gap-4 w-full min-w-0" style={{ minHeight: 'calc(100dvh - 80px)' }}>
        <div>
          <h1 className="text-[28px] font-semibold text-white leading-none" style={{ letterSpacing: '-0.04em' }}>
            Cargar <span style={{ color: '#F59E0B' }}>datos</span>
          </h1>
          <p className="text-[#3d5068] text-[13px] mt-1.5">Texto libre o CSV — múltiples productos, gastos y fecha global.</p>
        </div>

        <RecentHistory history={history} />

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1 pb-2 min-h-[220px]" style={{ maxHeight: '50vh' }}>
            {messages.length === 0 && !pending && (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-[8px] bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#a1a1aa] text-sm font-medium">Ingresa ventas, inversion y gastos en formato libre</p>
                  <p className="text-[#52525b] text-xs mt-1 leading-relaxed">
                    Ejemplo — múltiples productos y fechas:
                    <br />
                    <span className="text-[#a1a1aa]">5/4/26</span>
                    <br />
                    <span className="text-[#a1a1aa]">Curso A: 370000</span>
                    <br />
                    <span className="text-[#a1a1aa]">Producto B: 430000</span>
                    <br />
                    <span className="text-[#a1a1aa]">Servicio C: 45500</span>
                    <br />
                    <span className="text-[#a1a1aa]">Producto D: 24000</span>
                    <br />
                    <span className="text-[#a1a1aa]">6/4/26</span>
                    <br />
                    <span className="text-[#a1a1aa]">Curso A: 285000</span>
                    <br />
                    <span className="text-[#a1a1aa]">Gastos:</span>
                    <br />
                    <span className="text-[#a1a1aa]">Empleados: 80000</span>
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, index) => <ChatMessage key={index} msg={message} />)}

            {loading && (
              <div className="flex gap-2 items-center text-[#52525b] text-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[#52525b] rounded-[8px] animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-[#52525b] rounded-[8px] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-[#52525b] rounded-[8px] animate-bounce [animation-delay:300ms]" />
                </div>
                Procesando...
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {pending && (
            <ConfirmCard pending={pending} onConfirm={handleConfirm} onEdit={handleEdit} loading={loading} />
          )}

          {csvRows && (
            <div className="card border-[#F59E0B]/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[#F59E0B] text-sm font-medium">{csvRows.length} registros - {csvName}</p>
                <button onClick={() => setCsvRows(null)} className="text-[#52525b] hover:text-[#a1a1aa] text-xs">Cancelar</button>
              </div>
              <div className="max-h-40 overflow-y-auto text-xs text-[#a1a1aa] space-y-1">
                {csvRows.slice(0, 5).map((row, index) => (
                  <div key={`${row.product_name}-${index}`} className="grid grid-cols-[24px_minmax(0,1fr)_90px_90px] gap-3">
                    <span className="text-[#52525b]">{index + 1}</span>
                    <span className="text-white truncate">{row.product_name}</span>
                    <span className="text-[#10b981]">{fmt(row.revenue)}</span>
                    <span className="text-[#ef4444]">{fmt(row.investment)}</span>
                  </div>
                ))}
                {csvRows.length > 5 && <p className="text-[#52525b]">... y {csvRows.length - 5} mas</p>}
              </div>
              <button
                onClick={handleImportCSV}
                disabled={loading}
                className="w-full bg-[#F59E0B] hover:bg-[#E8A020] text-black text-sm font-semibold py-2 rounded-[6px] transition-colors disabled:opacity-50"
              >
                Importar {csvRows.length} registros
              </button>
            </div>
          )}

          {!pending && (
            <div className="flex gap-2 items-end flex-col sm:flex-row">
              <div className="flex-1 w-full bg-[#1f1f23] border border-[#2a2a2e] focus-within:border-[#F59E0B]/50 rounded-[8px] transition-colors">
                <textarea
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder={'5/4/26\nCurso A: 370000\nProducto B: 430000\nServicio C: 45500\nProducto D: 24000\n\n6/4/26\nCurso A: 285000\n\nGastos:\nEmpleados: 80000'}
                  rows={5}
                  className="w-full bg-transparent text-white text-sm px-4 pt-3 pb-1 resize-none focus:outline-none placeholder:text-[#52525b]"
                />
                <div className="flex items-center justify-between px-3 pb-2">
                  <button
                    onClick={() => fileRef.current.click()}
                    className="text-[#52525b] hover:text-[#F59E0B] text-xs flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7 8.586 13.586a2 2 0 1 0 2.828 2.828l6.414-6.586a4 4 0 0 0-5.656-5.656L5.757 10.757a6 6 0 1 0 8.486 8.486L20.5 13" />
                    </svg>
                    Subir CSV
                  </button>
                  <span className="text-[#52525b] text-xs">Enter para previsualizar</span>
                </div>
              </div>

              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-12 h-12 bg-[#F59E0B] hover:bg-[#E8A020] text-black rounded-[8px] flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0-7 7m7-7 7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      </div>
    </Layout>
  )
}
