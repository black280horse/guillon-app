import { useEffect, useMemo, useState, useRef } from 'react'
import axios from 'axios'
import Layout from '../components/Layout'
import { useToast } from '../context/ToastContext'

// ── Mini sparkline SVG ──────────────────────────────────────────────────────
function ProdMiniSpark({ values = [], color = '#F59E0B', w = 64, h = 28 }) {
  if (!values.length) return <svg width={w} height={h} />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 4) + 2
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ── KPI strip ───────────────────────────────────────────────────────────────
function ProductsKpiStrip({ products }) {
  const total = products.length
  const totalRevenue = products.reduce((s, p) => s + (p.total_revenue || 0), 0)
  const avgROAS = products.length
    ? products.reduce((s, p) => s + (p.avg_roas || 0), 0) / products.length
    : 0
  const profitable = products.filter(p => (p.avg_roas || 0) >= 2).length

  const fmt = v => v >= 1e6
    ? `$${(v / 1e6).toFixed(1)}M`
    : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toFixed(0)}`

  const kpis = [
    { label: 'Productos', value: total, color: '#818CF8' },
    { label: 'Revenue Total', value: fmt(totalRevenue), color: '#34D399' },
    { label: 'ROAS Promedio', value: avgROAS.toFixed(2) + 'x', color: '#F59E0B' },
    { label: 'Rentables (≥2x)', value: profitable, color: '#60A5FA' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
      {kpis.map(k => (
        <div key={k.label} className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{k.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Table row ───────────────────────────────────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉']

function ProductRow({ product, rank, selected, onSelect, onOpen, sparkData }) {
  const fmt = v => v >= 1e6
    ? `$${(v / 1e6).toFixed(1)}M`
    : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${Math.round(v)}`

  const roasColor = r => r >= 3 ? '#34D399' : r >= 1.5 ? '#F59E0B' : '#F87171'

  return (
    <tr
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
      onClick={() => onOpen(product)}
    >
      <td style={{ padding: '10px 12px', width: 32 }} onClick={e => { e.stopPropagation(); onSelect(product.id) }}>
        <input type="checkbox" checked={selected} onChange={() => {}} style={{ cursor: 'pointer', accentColor: '#F59E0B' }} />
      </td>
      <td style={{ padding: '10px 8px', width: 28, fontSize: 16 }}>
        {rank < 3 ? MEDALS[rank] : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>#{rank + 1}</span>}
      </td>
      <td style={{ padding: '10px 12px', fontWeight: 500, color: '#fff', whiteSpace: 'nowrap' }}>
        {product.name}
      </td>
      <td style={{ padding: '10px 12px', color: '#34D399', fontWeight: 600 }}>
        {fmt(product.total_revenue || 0)}
      </td>
      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>
        {fmt(product.total_investment || 0)}
      </td>
      <td style={{ padding: '10px 12px', fontWeight: 700, color: roasColor(product.avg_roas || 0) }}>
        {(product.avg_roas || 0).toFixed(2)}x
      </td>
      <td style={{ padding: '10px 8px' }}>
        <ProdMiniSpark values={sparkData} color="#F59E0B" />
      </td>
    </tr>
  )
}

// ── Grid card ────────────────────────────────────────────────────────────────
function ProductCard({ product, rank, onOpen }) {
  const fmt = v => v >= 1e6
    ? `$${(v / 1e6).toFixed(1)}M`
    : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${Math.round(v)}`
  const roasColor = r => r >= 3 ? '#34D399' : r >= 1.5 ? '#F59E0B' : '#F87171'

  return (
    <div className="card" style={{ padding: 16, cursor: 'pointer', position: 'relative' }}
      onClick={() => onOpen(product)}>
      {rank < 3 && (
        <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 18 }}>{MEDALS[rank]}</span>
      )}
      <div style={{ fontWeight: 600, color: '#fff', marginBottom: 8, paddingRight: 28 }}>{product.name}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Revenue</div>
          <div style={{ fontWeight: 700, color: '#34D399' }}>{fmt(product.total_revenue || 0)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>ROAS</div>
          <div style={{ fontWeight: 700, color: roasColor(product.avg_roas || 0) }}>
            {(product.avg_roas || 0).toFixed(2)}x
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Inversión</div>
          <div style={{ color: 'rgba(255,255,255,0.6)' }}>{fmt(product.total_investment || 0)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Ventas</div>
          <div style={{ color: 'rgba(255,255,255,0.6)' }}>{product.sale_count || 0}</div>
        </div>
      </div>
    </div>
  )
}

// ── Bulk action bar ──────────────────────────────────────────────────────────
function BulkActionBar({ count, onDelete, onClear }) {
  if (!count) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#1C1C28', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
      padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100,
    }}>
      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{count} seleccionados</span>
      <button onClick={onDelete} style={{
        background: '#F87171', color: '#fff', border: 'none', borderRadius: 8,
        padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
      }}>Eliminar</button>
      <button onClick={onClear} style={{
        background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none',
        borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
      }}>Cancelar</button>
    </div>
  )
}

// ── Product drawer ───────────────────────────────────────────────────────────
function ProductDrawer({ product, onClose, onSaved, onDeleted }) {
  const { showToast } = useToast()
  const [name, setName] = useState(product?.name || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isNew = !product?.id

  useEffect(() => {
    setName(product?.name || '')
    setConfirmDelete(false)
  }, [product])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        const { data } = await axios.post('/api/products', { name: name.trim() })
        showToast('Producto creado', 'success')
        onSaved(data)
      } else {
        const { data } = await axios.patch(`/api/products/${product.id}`, { name: name.trim() })
        showToast('Producto actualizado', 'success')
        onSaved(data)
      }
    } catch {
      showToast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await axios.delete(`/api/products/${product.id}`)
      showToast('Producto eliminado', 'success')
      onDeleted(product.id)
    } catch {
      showToast('Error al eliminar', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
        background: '#13131E', borderLeft: '1px solid rgba(255,255,255,0.1)',
        zIndex: 201, display: 'flex', flexDirection: 'column', padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>
            {isNew ? 'Nuevo producto' : 'Editar producto'}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: 20, lineHeight: 1,
          }}>×</button>
        </div>

        {!isNew && product && (
          <div style={{ marginBottom: 20, padding: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Revenue', `$${Math.round(product.total_revenue || 0).toLocaleString()}`],
                ['ROAS', `${(product.avg_roas || 0).toFixed(2)}x`],
                ['Inversión', `$${Math.round(product.total_investment || 0).toLocaleString()}`],
                ['Registros', product.sale_count || 0],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Nombre</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          autoFocus
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14,
            outline: 'none', marginBottom: 16,
          }}
        />

        <button onClick={handleSave} disabled={saving || !name.trim()} style={{
          background: '#F59E0B', color: '#0E0E14', border: 'none', borderRadius: 10,
          padding: '11px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          opacity: saving || !name.trim() ? 0.5 : 1, marginBottom: 12,
        }}>
          {saving ? 'Guardando...' : isNew ? 'Crear producto' : 'Guardar cambios'}
        </button>

        {!isNew && (
          <button onClick={handleDelete} disabled={deleting} style={{
            background: confirmDelete ? '#F87171' : 'rgba(248,113,113,0.12)',
            color: '#F87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10,
            padding: '11px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            {deleting ? 'Eliminando...' : confirmDelete ? 'Confirmar eliminacion' : 'Eliminar producto'}
          </button>
        )}
        {confirmDelete && (
          <button onClick={() => setConfirmDelete(false)} style={{
            marginTop: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer', fontSize: 13,
          }}>Cancelar</button>
        )}
      </div>
    </>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
function ProductsEmptyState({ onNew }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Sin productos</div>
      <div style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 24 }}>
        Agrega tu primer producto para empezar a registrar ventas.
      </div>
      <button onClick={onNew} style={{
        background: '#F59E0B', color: '#0E0E14', border: 'none', borderRadius: 10,
        padding: '10px 24px', fontWeight: 700, cursor: 'pointer',
      }}>Nuevo producto</button>
    </div>
  )
}

// ── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }) {
  return (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: 10 }}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '▼'}
    </span>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Products() {
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [salesByProduct, setSalesByProduct] = useState({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('table') // 'table' | 'grid'
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('total_revenue')
  const [sortDir, setSortDir] = useState('desc')
  const [selected, setSelected] = useState(new Set())
  const [drawerProduct, setDrawerProduct] = useState(undefined) // undefined=closed, null=new, obj=edit

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [{ data: prods }, { data: sales }] = await Promise.all([
        axios.get('/api/products'),
        axios.get('/api/sales'),
      ])
      setProducts(prods)

      // Build sparkline data per product (last 8 weeks of revenue)
      const byProd = {}
      for (const s of sales) {
        if (!byProd[s.product_id]) byProd[s.product_id] = []
        byProd[s.product_id].push({ date: s.date, revenue: s.revenue })
      }
      // Sort and take last 8
      for (const id of Object.keys(byProd)) {
        byProd[id] = byProd[id]
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-8)
          .map(d => d.revenue)
      }
      setSalesByProduct(byProd)
    } catch {
      showToast('Error cargando productos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let list = products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    )
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [products, search, sortKey, sortDir])

  const toggleSelect = id => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(p => p.id)))
  }

  const handleBulkDelete = async () => {
    if (!selected.size) return
    try {
      await Promise.all([...selected].map(id => axios.delete(`/api/products/${id}`)))
      showToast(`${selected.size} productos eliminados`, 'success')
      setSelected(new Set())
      fetchAll()
    } catch {
      showToast('Error al eliminar', 'error')
    }
  }

  const handleDrawerSaved = () => {
    setDrawerProduct(undefined)
    fetchAll()
  }

  const handleDrawerDeleted = () => {
    setDrawerProduct(undefined)
    fetchAll()
  }

  const thStyle = (key) => ({
    padding: '8px 12px', fontSize: 11, fontWeight: 600,
    color: sortKey === key ? '#F59E0B' : 'rgba(255,255,255,0.4)',
    textAlign: 'left', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  })

  return (
    <Layout>
      <div className="page-shell">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Productos</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              {products.length} producto{products.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
              {['table', 'grid'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '7px 14px', background: view === v ? 'rgba(255,255,255,0.12)' : 'none',
                  border: 'none', color: view === v ? '#fff' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontSize: 13,
                }}>
                  {v === 'table' ? '☰ Tabla' : '⊞ Grid'}
                </button>
              ))}
            </div>
            <button onClick={() => setDrawerProduct(null)} style={{
              background: '#F59E0B', color: '#0E0E14', border: 'none', borderRadius: 8,
              padding: '8px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
            }}>+ Nuevo</button>
          </div>
        </div>

        {/* KPI strip */}
        {!loading && <ProductsKpiStrip products={products} />}

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            style={{
              width: '100%', maxWidth: 320,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>Cargando...</div>
        ) : products.length === 0 ? (
          <ProductsEmptyState onNew={() => setDrawerProduct(null)} />
        ) : view === 'table' ? (
          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: '10px 12px', width: 32 }}>
                    <input type="checkbox"
                      checked={selected.size > 0 && selected.size === filtered.length}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', accentColor: '#F59E0B' }}
                    />
                  </th>
                  <th style={{ padding: '10px 8px', width: 28 }}></th>
                  <th style={{ ...thStyle('name'), cursor: 'default' }}>Producto</th>
                  <th style={thStyle('total_revenue')} onClick={() => toggleSort('total_revenue')}>
                    Revenue <SortIcon active={sortKey === 'total_revenue'} dir={sortDir} />
                  </th>
                  <th style={thStyle('total_investment')} onClick={() => toggleSort('total_investment')}>
                    Inversión <SortIcon active={sortKey === 'total_investment'} dir={sortDir} />
                  </th>
                  <th style={thStyle('avg_roas')} onClick={() => toggleSort('avg_roas')}>
                    ROAS <SortIcon active={sortKey === 'avg_roas'} dir={sortDir} />
                  </th>
                  <th style={{ padding: '8px 8px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    rank={i}
                    selected={selected.has(p.id)}
                    onSelect={toggleSelect}
                    onOpen={setDrawerProduct}
                    sparkData={salesByProduct[p.id] || []}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} rank={i} onOpen={setDrawerProduct} />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerProduct !== undefined && (
        <ProductDrawer
          product={drawerProduct}
          onClose={() => setDrawerProduct(undefined)}
          onSaved={handleDrawerSaved}
          onDeleted={handleDrawerDeleted}
        />
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        count={selected.size}
        onDelete={handleBulkDelete}
        onClear={() => setSelected(new Set())}
      />
    </Layout>
  )
}
