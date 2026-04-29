import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DndContext, DragOverlay,
  useDraggable, useDroppable,
  PointerSensor, TouchSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import axios from 'axios'
import { useToast } from '../context/ToastContext'
import Layout from '../components/Layout'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10)

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr + 'T12:00:00') - new Date(new Date().toDateString())
  return Math.ceil(diff / 86400000)
}

function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function fmtDateLong(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getDayNum(iso) {
  if (!iso) return null
  return new Date(iso + 'T12:00:00').getDate()
}

function getMonthAbbr(iso) {
  if (!iso) return null
  return new Date(iso + 'T12:00:00')
    .toLocaleDateString('es-AR', { month: 'short' })
    .toUpperCase()
    .replace('.', '')
}

function getRelativeLabel(dateStr, status) {
  if (!dateStr) return { text: 'Sin fecha', color: 'rgba(255,255,255,0.25)' }
  const days = daysUntil(dateStr)
  if (status === 'overdue' || (days !== null && days < 0)) {
    return { text: `Hace ${Math.abs(days)}d`, color: '#f87171' }
  }
  if (days === 0) return { text: 'Hoy', color: '#E8A020' }
  if (days === 1) return { text: 'Mañana', color: 'rgba(255,255,255,0.4)' }
  const name = new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long' })
  return { text: name.charAt(0).toUpperCase() + name.slice(1), color: 'rgba(255,255,255,0.4)' }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAMED_COLORS = {
  'Curso Meta Ads':    '#3b82f6',
  'Automatización IA': '#10b981',
  'Punnel IA':         '#8b5cf6',
  'Mini Curso 1K':     '#f59e0b',
  'Mini Curso 10K':    '#f59e0b',
}
const FALLBACK_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#f43f5e', '#84cc16', '#ec4899']

const PRIORITY_META = {
  high:   { label: 'Alta',  color: '#ef4444' },
  medium: { label: 'Media', color: '#f59e0b' },
  low:    { label: 'Baja',  color: '#22c55e' },
}

const COLUMNS_STATUS = [
  { id: 'pending',     label: 'Pendiente',   color: '#3b82f6' },
  { id: 'in_progress', label: 'En curso',    color: '#f59e0b' },
  { id: 'reviewing',   label: 'En revisión', color: '#8b5cf6' },
  { id: 'completed',   label: 'Listo',       color: '#10b981' },
]


// ─── Icon ─────────────────────────────────────────────────────────────────────

function SvgIcon({ d, size = 20, color, stroke = 1.8, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || 'currentColor'}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style}
    >
      <path d={d} />
    </svg>
  )
}

// ─── Status badge icon ────────────────────────────────────────────────────────

function StatusIcon({ status }) {
  const paths = {
    pending:     'M5 12h14m-7-7 7 7-7 7',
    in_progress: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    reviewing:   'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    completed:   'm5 12 4 4 10-9',
    overdue:     'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  }
  return <SvgIcon d={paths[status] || paths.pending} size={12} stroke={2} />
}

// ─── Task Modal ───────────────────────────────────────────────────────────────

function TaskModal({ task, initialStatus, products, colorMap, onClose, onSaved, onDeleted }) {
  const { addToast } = useToast()
  const isEdit = Boolean(task)
  const safeStatus = (task?.status === 'overdue' ? 'pending' : task?.status) || initialStatus || 'pending'

  const [form, setForm] = useState({
    title:       task?.title       || '',
    description: task?.description || '',
    due_date:    task?.due_date    || '',
    priority:    task?.priority    || 'medium',
    status:      safeStatus,
    product_id:  task?.product_id  != null ? String(task.product_id) : '',
  })
  const [loading, setLoading] = useState(false)

  const upd = key => e => setForm(f => ({ ...f, [key]: e.target.value }))
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) { addToast('El título es requerido', 'error'); return }
    setLoading(true)
    try {
      const payload = { ...form, product_id: form.product_id || null, due_date: form.due_date || null }
      if (isEdit) {
        const res = await axios.patch(`/api/tasks/${task.id}`, payload)
        onSaved(res.data, 'edit')
        addToast('Tarea actualizada', 'success')
      } else {
        const res = await axios.post('/api/tasks', payload)
        onSaved(res.data, 'create')
        addToast('Tarea creada', 'success')
      }
      onClose()
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al guardar', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!task) return
    setLoading(true)
    try {
      await axios.delete(`/api/tasks/${task.id}`)
      onDeleted(task.id)
      addToast('Tarea eliminada', 'info')
      onClose()
    } catch {
      addToast('Error al eliminar', 'error')
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} />
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 560,
          background: '#12121A', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 16, boxShadow: '0 32px 64px rgba(0,0,0,0.65)',
          animation: 'modalIn 0.18s cubic-bezier(0.2,0,0,1) both',
          overflow: 'hidden', fontFamily: "'DM Sans', sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ color: '#8ea0bc', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 500 }}>
            {isEdit ? 'Editar tarea' : 'Nueva tarea'}
          </p>
          <button onClick={onClose} className="tk-hdr-btn" style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}>
            <SvgIcon d="M6 6l12 12M18 6 6 18" size={16} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              required value={form.title} onChange={upd('title')}
              placeholder="Nombre de la tarea"
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}
            />
            <textarea
              value={form.description} onChange={upd('description')} rows={2}
              placeholder="Descripción (opcional)"
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#fff', resize: 'none', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
            />

            {/* Status + Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>Estado</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {COLUMNS_STATUS.map(col => (
                    <button key={col.id} type="button" onClick={() => set('status', col.id)}
                      style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.12s',
                        ...(form.status === col.id
                          ? { background: `${col.color}22`, color: col.color, border: `1px solid ${col.color}40` }
                          : { background: 'transparent', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }
                        )
                      }}>
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>Prioridad</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Object.entries(PRIORITY_META).map(([key, meta]) => (
                    <button key={key} type="button" onClick={() => set('priority', key)}
                      style={{ flex: 1, fontSize: 12, padding: '6px 0', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.12s',
                        ...(form.priority === key
                          ? { background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}38` }
                          : { background: 'transparent', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }
                        )
                      }}>
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product + Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>Producto</p>
                <select value={form.product_id} onChange={upd('product_id')}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#8ea0bc', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                  <option value="">General</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>Vencimiento</p>
                <input type="date" value={form.due_date} onChange={upd('due_date')}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#8ea0bc', outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', gap: 12 }}>
            <div>
              {isEdit && (
                <button type="button" onClick={handleDelete} disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, color: '#52525b', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#52525b'; e.currentTarget.style.background = 'transparent' }}>
                  <SvgIcon d="M6 7h12m-9 0V5h6v2m-7 0 1 12h8l1-12" size={14} />
                  Eliminar
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose}
                style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280', background: 'transparent', cursor: 'pointer', fontSize: 12.5, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                style={{ padding: '8px 20px', borderRadius: 10, background: '#E8A020', color: '#000', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, colorMap, onEdit, onUpdate, isOverlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const isOverdue   = task.status === 'overdue'
  const isCompleted = task.status === 'completed'
  const prodColor   = task.product_name ? (colorMap[task.product_name] || '#6b7280') : '#6b7280'
  const dayNum      = getDayNum(task.due_date)
  const monthAbbr   = getMonthAbbr(task.due_date)
  const daysLeft    = daysUntil(task.due_date)
  const isToday     = daysLeft === 0
  const relLabel    = getRelativeLabel(task.due_date, task.status)

  // Date block color scheme
  const dateStyle = isOverdue
    ? { bg: 'rgba(239,68,68,0.12)', numColor: '#ef4444', moColor: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }
    : isToday
    ? { bg: 'rgba(232,160,32,0.12)', numColor: '#E8A020', moColor: '#E8A020', border: '1px solid rgba(232,160,32,0.25)' }
    : { bg: 'rgba(255,255,255,0.06)', numColor: '#ffffff', moColor: 'rgba(255,255,255,0.5)', border: '1px solid transparent' }

  const cardStyle = isOverdue
    ? {
        background: 'rgba(30,15,15,0.9)',
        borderRadius: 10,
        border: '1px solid rgba(239,68,68,0.25)',
        borderLeft: '3px solid rgba(239,68,68,0.6)',
        padding: '14px 14px 12px 11px',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: 'pointer',
        opacity: isDragging ? 0.25 : 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isOverlay ? 9999 : undefined,
        boxShadow: isOverlay ? '0 16px 40px rgba(0,0,0,0.65)' : undefined,
      }
    : {
        background: '#1c1c2e',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 14px 12px',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: 'pointer',
        opacity: isDragging ? 0.25 : 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isOverlay ? 9999 : undefined,
        boxShadow: isOverlay ? '0 16px 40px rgba(0,0,0,0.65)' : undefined,
      }

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      className={isOverdue ? 'tk-card-overdue' : 'tk-card'}
      {...attributes}
      {...listeners}
      onClick={e => { e.stopPropagation(); onEdit(task) }}
    >
      {/* Row 1: product badge + date block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

        {/* Product badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          height: 22, borderRadius: 5, padding: '0 8px',
          fontSize: 11, fontWeight: 600,
          background: `${prodColor}26`,
          border: `1px solid ${prodColor}4D`,
          color: prodColor,
          maxWidth: 160, overflow: 'hidden',
        }}>
          <StatusIcon status={task.status} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.product_name || 'General'}
          </span>
        </div>

        {/* Date block */}
        {dayNum && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minWidth: 36, height: 40, borderRadius: 7, padding: '2px 6px',
            background: dateStyle.bg, border: dateStyle.border, flexShrink: 0,
          }}>
            <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1, color: dateStyle.numColor }}>
              {dayNum}
            </span>
            <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: dateStyle.moColor }}>
              {monthAbbr}
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 14, fontWeight: 500,
        color: isCompleted ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)',
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textDecoration: isCompleted ? 'line-through' : 'none',
      }}>
        {task.title}
      </p>

      {/* Row 2: relative date + checkbox */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

        {/* Relative date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <SvgIcon
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
            size={13} color="rgba(255,255,255,0.3)" stroke={1.8}
          />
          <span style={{ fontSize: 12, fontWeight: 400, color: relLabel.color }}>
            {relLabel.text}
          </span>
        </div>

        {/* Checkbox */}
        <div
          className="tk-checkbox"
          onClick={e => {
            e.stopPropagation()
            onUpdate(task.id, { status: isCompleted ? 'pending' : 'completed' })
          }}
          style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            border: isCompleted ? '1.5px solid #E8A020' : '1.5px solid rgba(255,255,255,0.2)',
            background: isCompleted ? '#E8A020' : 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s ease',
          }}
        >
          {isCompleted && (
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 4 4 10-9" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Product Kanban Column ────────────────────────────────────────────────────

function ProductColumn({ colId, label, color, tasks, colorMap, onAdd, onEdit, onUpdate, activeId, onDelete, productId }) {
  const { setNodeRef, isOver } = useDroppable({ id: colId })

  return (
    <div style={{
      width: 280, minWidth: 280, flexShrink: 0,
      background: isOver ? '#16162a' : '#13131f',
      borderRadius: 12,
      border: isOver ? `1px solid rgba(232,160,32,0.25)` : '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100dvh - 160px)',
      overflow: 'hidden',
      transition: 'background 0.12s ease, border-color 0.12s ease',
    }}>
      {/* Header */}
      <div style={{
        height: 52, padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#ffffff' }}>
            {label}
          </span>
          <span style={{
            minWidth: 20, height: 20, borderRadius: 5, padding: '0 5px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
            background: `${color}26`, color: color,
          }}>
            {tasks.length}
          </span>
        </div>
        {productId != null && onDelete && (
          <button
            onClick={() => { if (window.confirm(`¿Eliminar el producto "${label}" y desasignar sus tareas?`)) onDelete(productId) }}
            title="Eliminar producto"
            style={{
              width: 28, height: 28, borderRadius: 6, background: 'transparent',
              border: 'none', cursor: 'pointer', color: 'rgba(248,113,113,0.5)',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F87171' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.5)' }}
          >✕</button>
        )}
      </div>

      {/* Card list */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1, overflowY: 'auto', padding: 12,
          display: 'flex', flexDirection: 'column', gap: 10,
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        }}
      >
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            colorMap={colorMap}
            onEdit={onEdit}
            onUpdate={onUpdate}
            isOverlay={false}
          />
        ))}
        {tasks.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 60 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>Sin tareas</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <button
          onClick={() => onAdd(colId)}
          className="tk-col-add"
          style={{
            width: '100%', height: 34, borderRadius: 7,
            background: 'transparent', border: '1px dashed rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.35)', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          <span>Añadir tarea</span>
        </button>
      </div>
    </div>
  )
}

// ─── Overdue Column (Vencidas) ────────────────────────────────────────────────

function OverdueColumn({ tasks, colorMap, onEdit, onUpdate }) {
  return (
    <div style={{
      width: 280, minWidth: 280, flexShrink: 0,
      background: '#13131f',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.07)',
      borderTop: '2px solid rgba(239,68,68,0.4)',
      display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100dvh - 160px)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: 52, padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#f87171' }}>
            Vencidas
          </span>
          {tasks.length > 0 && (
            <span style={{
              minWidth: 20, height: 20, borderRadius: 5, padding: '0 5px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              background: 'rgba(239,68,68,0.2)', color: '#f87171',
            }}>
              {tasks.length}
            </span>
          )}
        </div>
        <button className="tk-hdr-btn" style={{
          width: 28, height: 28, borderRadius: 6, background: 'transparent',
          border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SvgIcon d="M6 7h12m-9 0V5h6v2m-7 0 1 12h8l1-12" size={15} stroke={1.8} />
        </button>
      </div>

      {/* Card list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 12,
        display: 'flex', flexDirection: 'column', gap: 10,
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent',
      }}>
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            colorMap={colorMap}
            onEdit={onEdit}
            onUpdate={onUpdate}
            isOverlay={false}
          />
        ))}
        {tasks.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 60 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>Sin vencidas 🎉</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <button className="tk-col-add" style={{
          width: '100%', height: 34, borderRadius: 7,
          background: 'transparent', border: '1px dashed rgba(239,68,68,0.25)',
          color: 'rgba(239,68,68,0.45)', fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>
          Ver archivadas →
        </button>
      </div>
    </div>
  )
}


// ─── Filter Pill ──────────────────────────────────────────────────────────────

function FilterPill({ label, count, badgeStyle, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={active ? '' : 'tk-pill'}
      style={{
        height: 36, borderRadius: 8, padding: '0 14px',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
        cursor: 'pointer', border: 'none', outline: 'none',
        ...(active
          ? { background: 'rgba(255,255,255,0.12)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }
          : { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }
        ),
        transition: 'background 0.12s ease, color 0.12s ease',
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          minWidth: 20, height: 20, borderRadius: 5, padding: '0 5px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          ...badgeStyle,
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Tasks() {
  const { addToast } = useToast()

  const [tasks,    setTasks]    = useState([])
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filterStatus, setFilterStatus] = useState('') // '' | 'pending' | 'in_progress' | 'completed' | 'overdue'
  const [modal, setModal] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 220, tolerance: 6 } }),
  )

  useEffect(() => {
    Promise.all([axios.get('/api/tasks'), axios.get('/api/products')])
      .then(([tr, pr]) => { setTasks(tr.data); setProducts(pr.data) })
      .finally(() => setLoading(false))
  }, [])

  // Color map: named colors for known products, fallback for others
  const colorMap = useMemo(() => {
    const map = {}
    products.forEach((p, i) => {
      map[p.name] = NAMED_COLORS[p.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
    })
    return map
  }, [products])

  // Status counts for filter pills
  const counts = useMemo(() => ({
    all:         tasks.length,
    pending:     tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed:   tasks.filter(t => t.status === 'completed').length,
    overdue:     tasks.filter(t => t.status === 'overdue').length,
  }), [tasks])

  // Filtered tasks for product/general columns
  // Default view excludes completed — completed tasks shown in separate section
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus === 'completed') return t.status === 'completed'
      if (!filterStatus) return t.status !== 'completed'
      return t.status === filterStatus
    })
  }, [tasks, filterStatus])

  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed'), [tasks])

  // Product columns: each product + "General" for unassigned tasks
  const productColumns = useMemo(() => {
    const cols = products.map(p => ({
      colId: `product-${p.id}`,
      productId: p.id,
      label: p.name,
      color: colorMap[p.name] || '#6b7280',
      tasks: filteredTasks.filter(t => t.product_id === p.id),
    }))
    // General column always visible so users can create/drop tasks without a product
    const generalTasks = filteredTasks.filter(t => !t.product_id)
    cols.push({ colId: 'product-null', productId: null, label: 'General', color: '#6b7280', tasks: generalTasks })
    return cols
  }, [products, filteredTasks, colorMap])

  // CRUD handlers
  const handleUpdate = useCallback(async (id, changes) => {
    try {
      const res = await axios.patch(`/api/tasks/${id}`, changes)
      setTasks(ts => ts.map(t => t.id === id ? res.data : t))
      if (changes.status === 'completed') addToast('¡Tarea lista!', 'success')
      else if (changes.status) addToast('Estado actualizado', 'info')
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al actualizar', 'error')
    }
  }, [addToast])

  const handleDelete = useCallback(async (id) => {
    try {
      await axios.delete(`/api/tasks/${id}`)
      setTasks(ts => ts.filter(t => t.id !== id))
      addToast('Tarea eliminada', 'info')
    } catch {
      addToast('Error al eliminar', 'error')
    }
  }, [addToast])

  function handleSaved(task, mode) {
    if (mode === 'create') setTasks(ts => [task, ...ts])
    else setTasks(ts => ts.map(t => t.id === task.id ? task : t))
  }

  function handleDeleted(id) {
    setTasks(ts => ts.filter(t => t.id !== id))
  }

  async function handleDeleteProduct(productId) {
    try {
      await axios.delete(`/api/products/${productId}`)
      setProducts(ps => ps.filter(p => p.id !== productId))
      setTasks(ts => ts.map(t => t.product_id === productId ? { ...t, product_id: null, product_name: null } : t))
      addToast('Producto eliminado', 'info')
    } catch {
      addToast('Error al eliminar producto', 'error')
    }
  }

  async function handleAddProduct() {
    if (!newProductName.trim()) return
    setAddingProduct(true)
    try {
      const { data } = await axios.post('/api/products', { name: newProductName.trim() })
      setProducts(ps => [...ps, data])
      setNewProductName('')
      addToast('Producto creado', 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al crear producto', 'error')
    } finally {
      setAddingProduct(false)
    }
  }

  // DnD — dragging between product columns updates product_id
  function handleDragStart({ active }) { setActiveId(active.id) }

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    if (!task) return

    const overId = String(over.id)
    let newProductId

    if (overId.startsWith('product-')) {
      const raw = overId.replace('product-', '')
      newProductId = raw === 'null' ? null : parseInt(raw, 10)
    } else {
      // Dropped on a card — find that card's product
      const overTaskId = typeof over.id === 'number' ? over.id : parseInt(over.id, 10)
      const overTask = tasks.find(t => t.id === overTaskId)
      if (!overTask) return
      newProductId = overTask.product_id
    }

    if (newProductId !== task.product_id) {
      handleUpdate(task.id, { product_id: newProductId })
    }
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  // Filter pills config
  const pills = [
    { id: '',          label: 'Todo',       count: counts.all,         badge: { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' } },
    { id: 'pending',   label: 'Pendiente',  count: counts.pending,     badge: { background: 'rgba(255,165,0,0.2)', color: '#ffaa33' } },
    { id: 'in_progress',label:'En curso',   count: counts.in_progress, badge: { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' } },
    { id: 'completed', label: 'Completadas',count: counts.completed,   badge: { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' } },
    { id: 'overdue',   label: 'Vencidas',   count: counts.overdue,     badge: { background: 'rgba(239,68,68,0.2)', color: '#f87171' } },
  ]

  if (loading) {
    return (
      <Layout>
        <div className="flex gap-4 pt-2 overflow-hidden">
          {[0,1,2,3].map(i => (
            <div key={i} className="skeleton rounded-xl shrink-0" style={{ width: 280, height: 420, opacity: 0.5 + i * 0.1 }} />
          ))}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Full-bleed kanban — bleeds out of page-shell padding */}
      <div style={{
        margin: '-24px -20px',
        height: 'calc(100dvh - 24px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Page header ──────────────────────────────────────────── */}
        <div style={{
          height: 60, flexShrink: 0,
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>
            Tareas
          </span>
          <button
            onClick={() => setModal({ status: 'pending' })}
            style={{
              height: 34, padding: '0 14px', borderRadius: 8,
              background: '#F59E0B', color: '#000',
              fontSize: 13, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background 0.12s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E8A020' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F59E0B' }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            Nueva tarea
          </button>
        </div>

        {/* ── Filter bar ───────────────────────────────────────────── */}
        <div style={{
          height: 52, flexShrink: 0,
          padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {pills.map(p => (
            <FilterPill
              key={p.id}
              label={p.label}
              count={p.count}
              badgeStyle={p.badge}
              active={filterStatus === p.id}
              onClick={() => setFilterStatus(s => s === p.id ? '' : p.id)}
            />
          ))}
        </div>

        {/* ── Kanban area ──────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          overflowX: 'auto', overflowY: 'hidden',
          padding: '20px 24px',
          display: 'flex', gap: 16, alignItems: 'flex-start',
        }}>
          {tasks.length === 0 ? (
            /* Empty state */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', minHeight: 300,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, background: 'rgba(232,160,32,0.1)',
                border: '1px solid rgba(232,160,32,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <SvgIcon d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" size={24} color="#E8A020" stroke={1.8} />
              </div>
              <p style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Sin tareas todavía</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 }}>Crea tu primera tarea para organizar el trabajo</p>
              <button
                onClick={() => setModal({ status: 'pending' })}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 10,
                  background: '#E8A020', color: '#000', border: 'none',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <span style={{ fontSize: 16 }}>+</span> Crear primera tarea
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Product columns */}
              {productColumns.map(col => (
                <ProductColumn
                  key={col.colId}
                  colId={col.colId}
                  label={col.label}
                  color={col.color}
                  tasks={col.tasks}
                  colorMap={colorMap}
                  onAdd={() => setModal({ status: 'pending', productId: col.productId })}
                  onEdit={task => setModal({ task })}
                  onUpdate={handleUpdate}
                  activeId={activeId}
                  productId={col.productId}
                  onDelete={col.productId != null ? handleDeleteProduct : null}
                />
              ))}

              {/* Add new product column */}
              {!addingProduct ? (
                <div style={{ width: 240, minWidth: 240, flexShrink: 0 }}>
                  <button
                    onClick={() => setAddingProduct(true)}
                    style={{
                      width: '100%', height: 52, borderRadius: 12,
                      background: 'transparent', border: '1px dashed rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.35)', fontSize: 13, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                    Nuevo producto
                  </button>
                </div>
              ) : (
                <div style={{ width: 240, minWidth: 240, flexShrink: 0, background: '#13131f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Nuevo producto</span>
                  <input
                    autoFocus
                    value={newProductName}
                    onChange={e => setNewProductName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddProduct(); if (e.key === 'Escape') { setAddingProduct(false); setNewProductName('') } }}
                    placeholder="Nombre del producto"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleAddProduct} style={{ flex: 1, background: '#F59E0B', color: '#0E0E14', border: 'none', borderRadius: 8, padding: '7px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Crear</button>
                    <button onClick={() => { setAddingProduct(false); setNewProductName('') }} style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                </div>
              )}

              <DragOverlay dropAnimation={null}>
                {activeTask && (
                  <TaskCard
                    task={activeTask}
                    colorMap={colorMap}
                    onEdit={() => {}}
                    onUpdate={() => {}}
                    isOverlay
                  />
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* ── Completadas ──────────────────────────────────────────── */}
        {completedTasks.length > 0 && filterStatus !== 'completed' && (
          <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0 24px' }}>
            <button
              onClick={() => setCompletedOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0',
                background: 'none', border: 'none', cursor: 'pointer', width: '100%',
              }}
            >
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                {completedOpen ? '▾' : '▸'} Completadas
              </span>
              <span style={{ fontSize: 12, background: 'rgba(52,211,153,0.15)', color: '#34D399', borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>
                {completedTasks.length}
              </span>
            </button>
            {completedOpen && (
              <div style={{ paddingBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {completedTasks.map(t => (
                  <div key={t.id} style={{
                    background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)',
                    borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'line-through' }}>{t.title}</span>
                    {t.product_name && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{t.product_name}</span>}
                    <button onClick={() => handleUpdate(t.id, { status: 'pending' })}
                      title="Mover a pendiente"
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}>↩</button>
                    <button onClick={() => handleDelete(t.id)}
                      title="Eliminar"
                      style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.4)', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────────────── */}
      {modal && (
        <TaskModal
          task={modal.task}
          initialStatus={modal.status || 'pending'}
          products={products}
          colorMap={colorMap}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </Layout>
  )
}
