import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '../components/Layout'
import { useToast } from '../context/ToastContext'

// ── Number parser (handles Argentine/Spanish format) ──────────────────────────
function parseLocalNumber(str) {
  if (!str) return NaN
  const s = String(str).trim()
  // Has comma → comma is decimal separator, dots are thousands separators
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  // Dot before exactly 3 digits at end → thousands separator
  if (/(\.\d{3})+$/.test(s)) return parseFloat(s.replace(/\./g, ''))
  return parseFloat(s)
}

const today = () => new Date().toISOString().slice(0, 10)

function parseDate(str) {
  if (!str) return today()
  const s = str.trim()
  // DD/MM/YYYY or D/M/YYYY or DD/M/YY or D/M/YY (2-digit year → 2000+)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return today()
}

// ── Smart flexible text parser ────────────────────────────────────────────────
const REVENUE_RE = /(?:ventas?|ingresos?|facturaci[oó]n|revenue|sales?)\s*:?\s*([\d.,]*)/i
const INVEST_RE  = /(?:inversi[oó]n(?:\s+ads?)?|inversi[oó]n|ads?\.?\s*inversi[oó]n|publicidad|inversion)\s*:?\s*([\d.,]*)/i
const DATE_RE    = /(?:fecha|date)\s*:?\s*([\d\/\-]+)/i
const SKIP_RE    = /^(extras?|otros\s+ingresos?|publicidad\s+general|empleados?|gastos?\s+fijos?|total\s*:?)\s*/i

function smartParse(text) {
  const results = []
  let globalDate = today()

  // Extract global date from text
  const dateLineMatch = text.match(DATE_RE)
  if (dateLineMatch) globalDate = parseDate(dateLineMatch[1])
  else {
    // Match DD/MM/YY, DD/MM/YYYY, D/M/YY, or YYYY-MM-DD
    const anyDate = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/)
    if (anyDate) globalDate = parseDate(anyDate[1])
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  let currentName = null
  let currentRevenue = null
  let currentInvestment = null

  const flush = () => {
    if (currentName && (currentRevenue !== null || currentInvestment !== null)) {
      results.push({
        product_name: currentName,
        date: globalDate,
        revenue: currentRevenue ?? 0,
        investment: currentInvestment ?? 0,
      })
    }
    currentName = null
    currentRevenue = null
    currentInvestment = null
  }

  for (const line of lines) {
    // Skip date lines and section headers to skip
    if (DATE_RE.test(line) && !REVENUE_RE.test(line) && !INVEST_RE.test(line)) continue
    if (SKIP_RE.test(line)) continue

    // Inline format: "Producto B → Inversión: 14.000 | Ventas: 24.000"
    if (line.includes('→') || (line.includes('|') && (REVENUE_RE.test(line) || INVEST_RE.test(line)))) {
      flush()
      const parts = line.split(/[→|]/).map(p => p.trim())
      const name = parts[0].replace(/^producto\s*/i, '').trim()
      let rev = null, inv = null
      for (const part of parts) {
        if (REVENUE_RE.test(part)) {
          const m = part.match(REVENUE_RE)
          if (m?.[1]) rev = parseLocalNumber(m[1])
        }
        if (INVEST_RE.test(part)) {
          const m = part.match(INVEST_RE)
          if (m?.[1]) inv = parseLocalNumber(m[1])
        }
      }
      if (name && (rev !== null || inv !== null)) {
        results.push({ product_name: name, date: globalDate, revenue: rev ?? 0, investment: inv ?? 0 })
      }
      continue
    }

    // Revenue field
    const revMatch = line.match(REVENUE_RE)
    if (revMatch) {
      currentRevenue = revMatch[1] ? parseLocalNumber(revMatch[1]) : 0
      continue
    }

    // Investment field
    const invMatch = line.match(INVEST_RE)
    if (invMatch) {
      currentInvestment = invMatch[1] ? parseLocalNumber(invMatch[1]) : 0
      continue
    }

    // If we already have revenue/investment collected for previous product, flush first
    if (currentName && (currentRevenue !== null || currentInvestment !== null)) flush()

    // This line is likely a product name
    const name = line.replace(/^producto\s*/i, '').trim()
    // Ignore lines that look like field labels without values
    if (name && !/:$/.test(name) && name.length > 0) {
      currentName = name
    }
  }

  flush()
  return results
}

// ── Single entry form ─────────────────────────────────────────────────────────
function SingleForm({ products, onSaved }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({ product_name: '', date: today(), revenue: '', investment: '' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.product_name || !form.revenue || !form.investment) return
    setSaving(true)
    try {
      await axios.post('/api/sales', {
        product_name: form.product_name,
        date: form.date,
        revenue: parseFloat(form.revenue),
        investment: parseFloat(form.investment),
      })
      showToast('Registro guardado', 'success')
      setForm({ product_name: '', date: today(), revenue: '', investment: '' })
      onSaved()
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6, display: 'block' }

  const rev = parseFloat(form.revenue), inv = parseFloat(form.investment)
  const showPreview = !isNaN(rev) && !isNaN(inv) && rev > 0 && inv > 0

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Producto</label>
          <input list="prod-list" value={form.product_name} onChange={e => set('product_name', e.target.value)}
            placeholder="Nombre del producto" required style={inputStyle} />
          <datalist id="prod-list">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
        </div>
        <div>
          <label style={labelStyle}>Fecha</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Facturación ($)</label>
          <input type="number" min="0" step="0.01" value={form.revenue}
            onChange={e => set('revenue', e.target.value)} placeholder="0.00" required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Inversión ($)</label>
          <input type="number" min="0" step="0.01" value={form.investment}
            onChange={e => set('investment', e.target.value)} placeholder="0.00" required style={inputStyle} />
        </div>
        {showPreview && (
          <div style={{ gridColumn: '1/-1', padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, fontSize: 13, display: 'flex', gap: 20 }}>
            <span><span style={{ color: 'rgba(255,255,255,0.5)' }}>Ganancia: </span><span style={{ color: '#34D399', fontWeight: 700 }}>${(rev - inv).toFixed(2)}</span></span>
            <span><span style={{ color: 'rgba(255,255,255,0.5)' }}>ROI: </span><span style={{ color: '#F59E0B', fontWeight: 700 }}>{(((rev - inv) / inv) * 100).toFixed(1)}%</span></span>
            <span><span style={{ color: 'rgba(255,255,255,0.5)' }}>ROAS: </span><span style={{ color: '#F59E0B', fontWeight: 700 }}>{(rev / inv).toFixed(2)}x</span></span>
          </div>
        )}
      </div>
      <button type="submit" disabled={saving} style={{
        width: '100%', background: '#F59E0B', color: '#0E0E14', border: 'none',
        borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1,
      }}>
        {saving ? 'Guardando...' : 'Guardar registro'}
      </button>
    </form>
  )
}

// ── Bulk load form (smart parser, no preview step) ────────────────────────────
function BulkForm({ onSaved }) {
  const { showToast } = useToast()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  // Live-parse to show count
  const parsed = text.trim() ? smartParse(text) : []

  const handleLoad = async () => {
    if (!parsed.length) {
      showToast('No se detectaron registros válidos', 'error')
      return
    }
    setSaving(true)
    try {
      const { data } = await axios.post('/api/sales/bulk', { entries: parsed })
      setLastResult(data)
      showToast(`${data.created} registros cargados`, 'success')
      setText('')
      onSaved()
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al cargar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
        <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Formato flexible</strong> — pega desde cualquier fuente:<br />
        <code style={{ color: '#F59E0B' }}>Fecha: 25/04/2026</code><br />
        <code style={{ color: '#F59E0B' }}>Producto A</code><br />
        <code style={{ color: '#F59E0B' }}>Inversión: 123.000 / Ventas: 260.000</code><br />
        <code style={{ color: '#F59E0B' }}>Producto B → Inversión: 14.000 | Ventas: 24.000</code>
      </div>

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setLastResult(null) }}
        placeholder={'Fecha: 25/04/2026\n\nProducto A\nInversión: 123.000\nVentas: 260.000\n\nProducto B → Inversión: 14.000 | Ventas: 24.000'}
        style={{
          width: '100%', minHeight: 200, background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 12,
          color: '#fff', fontSize: 13, fontFamily: 'monospace', resize: 'vertical', outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Live detection indicator */}
      {text.trim() && (
        <div style={{ marginTop: 8, fontSize: 12, color: parsed.length ? '#34D399' : '#F87171' }}>
          {parsed.length
            ? `✓ ${parsed.length} producto${parsed.length > 1 ? 's' : ''} detectado${parsed.length > 1 ? 's' : ''}`
            : '✗ No se detectaron productos — revisa el formato'}
        </div>
      )}

      <button
        onClick={handleLoad}
        disabled={saving || !parsed.length}
        style={{
          marginTop: 12, width: '100%', background: '#F59E0B', color: '#0E0E14', border: 'none',
          borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          opacity: saving || !parsed.length ? 0.5 : 1,
        }}
      >
        {saving ? 'Cargando...' : parsed.length ? `Cargar ${parsed.length} registros` : 'Cargar datos'}
      </button>

      {lastResult && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(52,211,153,0.1)', borderRadius: 8, fontSize: 13 }}>
          <span style={{ color: '#34D399', fontWeight: 700 }}>✓ {lastResult.created} registros cargados</span>
          {lastResult.errors?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              {lastResult.errors.map((e, i) => (
                <div key={i} style={{ color: '#F87171', fontSize: 12 }}>✗ {e.entry?.product_name || '?'}: {e.error}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview table */}
      {parsed.length > 0 && !lastResult && (
        <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Producto', 'Fecha', 'Facturación', 'Inversión', 'Ganancia', 'ROI'].map(h => (
                  <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.map((r, i) => {
                const profit = r.revenue - r.investment
                const roi = r.investment > 0 ? ((profit / r.investment) * 100).toFixed(1) : '-'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 12px', color: '#fff' }}>{r.product_name}</td>
                    <td style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.5)' }}>{r.date}</td>
                    <td style={{ padding: '7px 12px', color: '#34D399' }}>${r.revenue.toLocaleString()}</td>
                    <td style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.6)' }}>${r.investment.toLocaleString()}</td>
                    <td style={{ padding: '7px 12px', color: profit >= 0 ? '#34D399' : '#F87171' }}>${profit.toLocaleString()}</td>
                    <td style={{ padding: '7px 12px', color: parseFloat(roi) >= 0 ? '#F59E0B' : '#F87171', fontWeight: 700 }}>{roi !== '-' ? `${roi}%` : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────
function HistoryTab({ sales, loading, onDelete, onEdit }) {
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const startEdit = s => {
    setEditId(s.id)
    setEditForm({ date: s.date, revenue: s.revenue, investment: s.investment })
  }

  const handleSave = async id => {
    setSaving(true)
    try {
      await axios.patch(`/api/sales/${id}`, {
        date: editForm.date,
        revenue: parseFloat(editForm.revenue),
        investment: parseFloat(editForm.investment),
      })
      showToast('Actualizado', 'success')
      setEditId(null)
      onEdit()
    } catch {
      showToast('Error al actualizar', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Cargando...</div>
  if (!sales.length) return <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Sin registros</div>

  const inputS = {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 13, outline: 'none', width: '100%',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {['Producto', 'Fecha', 'Facturación', 'Inversión', 'Ganancia', 'ROI', ''].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sales.slice(0, 100).map(s => {
            const isEditing = editId === s.id
            const profit = s.revenue - s.investment
            const roi = s.investment > 0 ? ((profit / s.investment) * 100).toFixed(1) : '-'
            const roiColor = parseFloat(roi) >= 0 ? '#34D399' : '#F87171'
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '7px 12px', color: '#fff' }}>{s.product_name}</td>
                <td style={{ padding: '7px 10px' }}>
                  {isEditing
                    ? <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} style={inputS} />
                    : <span style={{ color: 'rgba(255,255,255,0.6)' }}>{s.date}</span>}
                </td>
                <td style={{ padding: '7px 10px' }}>
                  {isEditing
                    ? <input type="number" value={editForm.revenue} onChange={e => setEditForm(f => ({ ...f, revenue: e.target.value }))} style={{ ...inputS, width: 90 }} />
                    : <span style={{ color: '#34D399' }}>${s.revenue.toLocaleString()}</span>}
                </td>
                <td style={{ padding: '7px 10px' }}>
                  {isEditing
                    ? <input type="number" value={editForm.investment} onChange={e => setEditForm(f => ({ ...f, investment: e.target.value }))} style={{ ...inputS, width: 90 }} />
                    : <span style={{ color: 'rgba(255,255,255,0.6)' }}>${s.investment.toLocaleString()}</span>}
                </td>
                <td style={{ padding: '7px 12px', color: profit >= 0 ? '#34D399' : '#F87171', fontWeight: 600 }}>
                  ${profit.toLocaleString()}
                </td>
                <td style={{ padding: '7px 12px', fontWeight: 700, color: roiColor }}>
                  {roi !== '-' ? `${roi}%` : '-'}
                </td>
                <td style={{ padding: '7px 12px' }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleSave(s.id)} disabled={saving} style={{ background: '#34D399', color: '#0E0E14', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>OK</button>
                      <button onClick={() => setEditId(null)} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => startEdit(s)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 13, padding: '2px 6px' }} title="Editar">✎</button>
                      <button onClick={() => onDelete(s.id)} style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.5)', cursor: 'pointer', fontSize: 13, padding: '2px 6px' }} title="Eliminar">✕</button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DataEntry() {
  const { showToast } = useToast()
  const [tab, setTab] = useState('single')
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [loadingSales, setLoadingSales] = useState(false)

  useEffect(() => {
    axios.get('/api/products').then(r => setProducts(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 'history') fetchSales()
  }, [tab])

  const fetchSales = async () => {
    setLoadingSales(true)
    try {
      const { data } = await axios.get('/api/sales')
      setSales(data)
    } catch {
      showToast('Error cargando historial', 'error')
    } finally {
      setLoadingSales(false)
    }
  }

  const handleDelete = async id => {
    try {
      await axios.delete(`/api/sales/${id}`)
      showToast('Eliminado', 'success')
      setSales(s => s.filter(x => x.id !== id))
    } catch {
      showToast('Error al eliminar', 'error')
    }
  }

  const tabs = [
    { key: 'single', label: 'Registro individual' },
    { key: 'bulk',   label: 'Carga masiva' },
    { key: 'history', label: 'Historial' },
  ]

  return (
    <Layout>
      <div className="page-shell">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Cargar datos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Registra facturación e inversión por producto
          </p>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: tab === t.key ? 'rgba(255,255,255,0.12)' : 'none',
              border: 'none', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.45)',
              padding: '7px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400, transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        <div className="card" style={{ maxWidth: tab === 'history' ? '100%' : 600, padding: 24 }}>
          {tab === 'single'  && <SingleForm products={products} onSaved={() => {}} />}
          {tab === 'bulk'    && <BulkForm onSaved={() => {}} />}
          {tab === 'history' && <HistoryTab sales={sales} loading={loadingSales} onDelete={handleDelete} onEdit={fetchSales} />}
        </div>
      </div>
    </Layout>
  )
}
