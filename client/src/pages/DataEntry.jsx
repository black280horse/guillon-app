import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import Layout from '../components/Layout'
import { useToast } from '../context/ToastContext'

// ── Helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10)

function parseCSVOrTSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const rows = []
  for (const line of lines) {
    const sep = line.includes('\t') ? '\t' : ','
    const cols = line.split(sep).map(c => c.replace(/^"|"$/g, '').trim())
    if (cols.length >= 4) {
      rows.push({
        product_name: cols[0],
        date: cols[1],
        revenue: cols[2],
        investment: cols[3],
      })
    }
  }
  return rows
}

// ── Single entry form ────────────────────────────────────────────────────────
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
    borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6, display: 'block' }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Producto</label>
          <input
            list="prod-list"
            value={form.product_name}
            onChange={e => set('product_name', e.target.value)}
            placeholder="Nombre del producto"
            required
            style={inputStyle}
          />
          <datalist id="prod-list">
            {products.map(p => <option key={p.id} value={p.name} />)}
          </datalist>
        </div>
        <div>
          <label style={labelStyle}>Fecha</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
            required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Revenue ($)</label>
          <input type="number" min="0" step="0.01" value={form.revenue}
            onChange={e => set('revenue', e.target.value)} placeholder="0.00" required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Inversion ($)</label>
          <input type="number" min="0" step="0.01" value={form.investment}
            onChange={e => set('investment', e.target.value)} placeholder="0.00" required style={inputStyle} />
        </div>
        {form.revenue && form.investment && parseFloat(form.investment) > 0 && (
          <div style={{ gridColumn: '1/-1', padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>ROAS estimado: </span>
            <span style={{ color: '#F59E0B', fontWeight: 700 }}>
              {(parseFloat(form.revenue) / parseFloat(form.investment)).toFixed(2)}x
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 16 }}>Profit: </span>
            <span style={{ color: '#34D399', fontWeight: 700 }}>
              ${(parseFloat(form.revenue) - parseFloat(form.investment)).toFixed(2)}
            </span>
          </div>
        )}
      </div>
      <button type="submit" disabled={saving} style={{
        width: '100%', background: '#F59E0B', color: '#0E0E14', border: 'none',
        borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        opacity: saving ? 0.6 : 1,
      }}>
        {saving ? 'Guardando...' : 'Guardar registro'}
      </button>
    </form>
  )
}

// ── Bulk paste form ──────────────────────────────────────────────────────────
function BulkForm({ onSaved }) {
  const { showToast } = useToast()
  const [text, setText] = useState('')
  const [preview, setPreview] = useState([])
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  const handleParse = () => {
    const rows = parseCSVOrTSV(text)
    const errs = []
    const valid = []
    for (const r of rows) {
      if (!r.product_name) { errs.push({ row: r, error: 'product_name vacio' }); continue }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) { errs.push({ row: r, error: `fecha invalida: ${r.date}` }); continue }
      const rev = parseFloat(r.revenue)
      const inv = parseFloat(r.investment)
      if (isNaN(rev) || isNaN(inv)) { errs.push({ row: r, error: 'revenue/investment no numericos' }); continue }
      valid.push({ ...r, revenue: rev, investment: inv })
    }
    setPreview(valid)
    setErrors(errs)
    setResult(null)
  }

  const handleSubmit = async () => {
    if (!preview.length) return
    setSaving(true)
    try {
      const { data } = await axios.post('/api/sales/bulk', { entries: preview })
      setResult(data)
      showToast(`${data.created} registros importados`, 'success')
      setText('')
      setPreview([])
      setErrors([])
      onSaved()
    } catch (err) {
      showToast(err.response?.data?.error || 'Error en importacion', 'error')
    } finally {
      setSaving(false)
    }
  }

  const taStyle = {
    width: '100%', minHeight: 180, background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 12,
    color: '#fff', fontSize: 13, fontFamily: 'monospace', resize: 'vertical', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div>
      <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
        Formato: <code style={{ color: '#F59E0B' }}>producto, YYYY-MM-DD, revenue, inversion</code>
        {' '}— una fila por linea, separado por coma o tabulacion (pega directo desde Excel)
      </div>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setPreview([]); setErrors([]) }}
        placeholder={'Zapatilla Roja, 2024-01-15, 5000, 1200\nRemera Blanca, 2024-01-16, 3200, 800'}
        style={taStyle}
      />
      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        <button onClick={handleParse} disabled={!text.trim()} style={{
          background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 18px', cursor: 'pointer', fontSize: 13, opacity: !text.trim() ? 0.5 : 1,
        }}>Previsualizar</button>
        {preview.length > 0 && (
          <button onClick={handleSubmit} disabled={saving} style={{
            background: '#F59E0B', color: '#0E0E14', border: 'none', borderRadius: 8,
            padding: '8px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>
            {saving ? 'Importando...' : `Importar ${preview.length} registros`}
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {errors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: '#F87171', padding: '4px 0' }}>
              ✗ {e.row.product_name || '?'} — {e.error}
            </div>
          ))}
        </div>
      )}

      {preview.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Producto', 'Fecha', 'Revenue', 'Inversion', 'ROAS'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => {
                const roas = r.investment > 0 ? (r.revenue / r.investment).toFixed(2) : '-'
                const roasColor = parseFloat(roas) >= 2 ? '#34D399' : parseFloat(roas) >= 1 ? '#F59E0B' : '#F87171'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 12px', color: '#fff' }}>{r.product_name}</td>
                    <td style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.6)' }}>{r.date}</td>
                    <td style={{ padding: '7px 12px', color: '#34D399' }}>${r.revenue.toLocaleString()}</td>
                    <td style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.6)' }}>${r.investment.toLocaleString()}</td>
                    <td style={{ padding: '7px 12px', fontWeight: 700, color: roasColor }}>{roas}x</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(52,211,153,0.1)', borderRadius: 8, fontSize: 13, color: '#34D399' }}>
          ✓ {result.created} registros importados exitosamente
          {result.errors?.length > 0 && <span style={{ color: '#F87171', marginLeft: 12 }}>{result.errors.length} errores</span>}
        </div>
      )}
    </div>
  )
}

// ── History tab ──────────────────────────────────────────────────────────────
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
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {['Producto', 'Fecha', 'Revenue', 'Inversion', 'ROAS', ''].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sales.slice(0, 100).map(s => {
            const isEditing = editId === s.id
            const roas = s.investment > 0 ? (s.revenue / s.investment).toFixed(2) : '-'
            const roasColor = parseFloat(roas) >= 2 ? '#34D399' : parseFloat(roas) >= 1 ? '#F59E0B' : '#F87171'
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
                <td style={{ padding: '7px 12px', fontWeight: 700, color: roasColor }}>{roas}x</td>
                <td style={{ padding: '7px 12px' }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleSave(s.id)} disabled={saving} style={{
                        background: '#34D399', color: '#0E0E14', border: 'none', borderRadius: 6,
                        padding: '3px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      }}>OK</button>
                      <button onClick={() => setEditId(null)} style={{
                        background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: 'none',
                        borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12,
                      }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => startEdit(s)} style={{
                        background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
                        cursor: 'pointer', fontSize: 13, padding: '2px 6px',
                      }} title="Editar">✎</button>
                      <button onClick={() => onDelete(s.id)} style={{
                        background: 'none', border: 'none', color: 'rgba(248,113,113,0.5)',
                        cursor: 'pointer', fontSize: 13, padding: '2px 6px',
                      }} title="Eliminar">✕</button>
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DataEntry() {
  const { showToast } = useToast()
  const [tab, setTab] = useState('single') // 'single' | 'bulk' | 'history'
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
    { key: 'bulk', label: 'Carga masiva' },
    { key: 'history', label: 'Historial' },
  ]

  return (
    <Layout>
      <div className="page-shell">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Cargar datos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Registra ventas e inversiones por producto
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: tab === t.key ? 'rgba(255,255,255,0.12)' : 'none',
              border: 'none', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.45)',
              padding: '7px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
              transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        <div className="card" style={{ maxWidth: tab === 'history' ? '100%' : 560, padding: 24 }}>
          {tab === 'single' && <SingleForm products={products} onSaved={() => {}} />}
          {tab === 'bulk' && <BulkForm onSaved={() => {}} />}
          {tab === 'history' && (
            <HistoryTab sales={sales} loading={loadingSales} onDelete={handleDelete} onEdit={fetchSales} />
          )}
        </div>
      </div>
    </Layout>
  )
}
