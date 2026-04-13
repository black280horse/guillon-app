import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { Link } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'
import { useToast } from '../context/ToastContext'

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function daysLabel(days, status) {
  if (status === 'completed') return null
  if (days === null) return { text: 'Sin fecha', cls: 'text-[#3f3f46]' }
  if (days < 0 || status === 'overdue') return { text: `Venció hace ${Math.abs(days)}d`, cls: 'text-[#ef4444]' }
  if (days === 0) return { text: 'Hoy', cls: 'text-[#f59e0b]' }
  if (days <= 3) return { text: `En ${days} días`, cls: 'text-[#f59e0b]' }
  return { text: `En ${days} días`, cls: 'text-[#52525b]' }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRODUCT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f43f5e', '#84cc16']

const COLUMNS = [
  { id: 'pending',     label: 'Pendiente',   color: '#3b82f6' },
  { id: 'in_progress', label: 'En curso',    color: '#f59e0b' },
  { id: 'reviewing',   label: 'En revisión', color: '#8b5cf6' },
  { id: 'completed',   label: 'Listo',       color: '#10b981' },
]

const PRIORITY_META = {
  high:   { label: 'Alta',  color: '#ef4444' },
  medium: { label: 'Media', color: '#f59e0b' },
  low:    { label: 'Baja',  color: '#22c55e' },
}

const STATUS_META = {
  pending:     { label: 'Pendiente',   color: '#3b82f6' },
  in_progress: { label: 'En curso',    color: '#f59e0b' },
  reviewing:   { label: 'En revisión', color: '#8b5cf6' },
  completed:   { label: 'Listo',       color: '#10b981' },
  overdue:     { label: 'Vencida',     color: '#ef4444' },
}

const TABS = [
  { id: 'kanban', label: 'Kanban',    icon: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18' },
  { id: 'table',  label: 'Tabla',     icon: 'M3 10h18M3 14h18M10 3v18M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z' },
  { id: 'calendar', label: 'Calendario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
]

// ─── Icon ─────────────────────────────────────────────────────────────────────

function Icon({ path, className = 'w-4 h-4', stroke = 1.8 }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke} d={path} />
    </svg>
  )
}

// ─── KanbanCard ───────────────────────────────────────────────────────────────

function KanbanCard({ task, colorMap, onEdit, onUpdate, onDelete, isOverlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const isCompleted = task.status === 'completed'
  const isOverdue   = task.status === 'overdue'
  const pri         = PRIORITY_META[task.priority] || PRIORITY_META.medium
  const prodColor   = task.product_name ? (colorMap[task.product_name] || '#6b7280') : null
  const days        = daysUntil(task.due_date)
  const dayLbl      = daysLabel(days, task.status)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.25 : 1,
        zIndex: isOverlay ? 9999 : undefined,
      }}
      className={`group relative bg-[#1c1c1f] border rounded-[8px] overflow-hidden select-none transition-all duration-150 ${
        isCompleted ? 'border-[#2a2a2e] opacity-60' : isOverdue ? 'border-[#ef4444]/30' : 'border-[#2a2a2e] hover:border-[#3a3a40]'
      } ${isOverlay ? 'shadow-[0_20px_40px_rgba(0,0,0,0.6)] scale-[1.02]' : ''}`}
    >
      {/* Priority left border */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: pri.color }} />

      <div className="pl-[11px] pr-2.5 py-2.5">
        {/* Title row */}
        <div className="flex items-start gap-1.5">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-[3px] text-[#3a3a42] hover:text-[#6b6b78] cursor-grab active:cursor-grabbing shrink-0 touch-none"
            onClick={e => e.stopPropagation()}
            tabIndex={-1}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="7" cy="4.5" r="1.2" /><circle cx="13" cy="4.5" r="1.2" />
              <circle cx="7" cy="9.5" r="1.2" /><circle cx="13" cy="9.5" r="1.2" />
              <circle cx="7" cy="14.5" r="1.2" /><circle cx="13" cy="14.5" r="1.2" />
            </svg>
          </button>
          <button
            className="flex-1 text-left"
            onClick={() => onEdit(task)}
          >
            <p className={`text-[13.5px] font-medium leading-snug ${isCompleted ? 'line-through text-[#4a4a52]' : 'text-[#e4e4e7]'}`}>
              {task.title}
            </p>
          </button>
        </div>

        {/* Product + priority row */}
        <div className="flex items-center gap-1.5 mt-2 pl-[18px] flex-wrap">
          {prodColor && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-[4px] font-medium truncate max-w-[120px]"
              style={{ background: `${prodColor}20`, color: prodColor }}
            >
              {task.product_name}
            </span>
          )}
          {isOverdue && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] bg-[#ef4444]/15 text-[#ef4444] font-medium">
              Vencida
            </span>
          )}
          <span
            className="text-[11px] px-1.5 py-0.5 rounded-[4px] font-medium ml-auto shrink-0"
            style={{ background: `${pri.color}18`, color: pri.color }}
          >
            {pri.label}
          </span>
        </div>

        {/* Date + action row */}
        <div className="flex items-center justify-between mt-2 pl-[18px]">
          {dayLbl ? (
            <span className={`text-[11px] tabular-nums ${dayLbl.cls}`}>
              {task.due_date ? `${fmtDate(task.due_date)} · ` : ''}{dayLbl.text}
            </span>
          ) : (
            <span className="text-[11px] text-[#22c55e]">✓ Listo</span>
          )}

          {/* Hover actions */}
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            {!isCompleted && (
              <button
                onClick={e => { e.stopPropagation(); onUpdate(task.id, { status: 'completed' }) }}
                title="Marcar como listo"
                className="w-6 h-6 rounded-[5px] flex items-center justify-center text-[#3a3a42] hover:text-[#10b981] hover:bg-[#10b981]/12 transition-all"
              >
                <Icon className="w-3.5 h-3.5" stroke={2.5} path="m5 12 4 4 10-9" />
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); onEdit(task) }}
              title="Editar"
              className="w-6 h-6 rounded-[5px] flex items-center justify-center text-[#3a3a42] hover:text-[#a1a1aa] hover:bg-white/[0.06] transition-all"
            >
              <Icon className="w-3 h-3" path="m16.86 4.49-.7-.7a2 2 0 0 0-2.83 0L4 13.12V17h3.88l9.33-9.33a2 2 0 0 0 0-2.83z" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(task.id) }}
              title="Eliminar"
              className="w-6 h-6 rounded-[5px] flex items-center justify-center text-[#3a3a42] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
            >
              <Icon className="w-3.5 h-3.5" path="M6 7h12m-9 0V5h6v2m-7 0 1 12h8l1-12" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({ col, tasks, colorMap, onAdd, onEdit, onUpdate, onDelete, activeId }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <div className="flex flex-col min-h-0">
      {/* Column header — solid color */}
      <div
        className="px-3 py-2.5 rounded-t-[10px] flex items-center justify-between gap-2 shrink-0"
        style={{ background: col.color }}
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-[13px] tracking-[-0.01em]">{col.label}</span>
          <span className="bg-black/25 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAdd(col.id)}
          title="Agregar tarea"
          className="w-6 h-6 rounded-[6px] flex items-center justify-center text-white/60 hover:text-white hover:bg-black/20 transition-all"
        >
          <Icon className="w-3.5 h-3.5" stroke={2.5} path="M12 5v14M5 12h14" />
        </button>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`flex-1 bg-[#18181b] border border-t-0 rounded-b-[10px] p-2 flex flex-col gap-2 overflow-y-auto transition-colors duration-100 ${
          isOver ? 'bg-[#1f1f24] border-[#3a3a44]' : 'border-[#2a2a2e]'
        }`}
        style={{ maxHeight: 'calc(100vh - 224px)' }}
      >
        {tasks.length === 0 && !activeId && (
          <div className="flex items-center justify-center h-16 text-[#2e2e36] text-[12px] border border-dashed border-[#242428] rounded-[6px] mx-0.5">
            Sin tareas
          </div>
        )}
        {activeId && tasks.length === 0 && isOver && (
          <div className="h-16 border-2 border-dashed rounded-[6px] mx-0.5 transition-colors" style={{ borderColor: col.color + '50' }} />
        )}

        {tasks.map(task => (
          <KanbanCard
            key={task.id}
            task={task}
            colorMap={colorMap}
            onEdit={onEdit}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}

        {/* Add button at footer */}
        <button
          onClick={() => onAdd(col.id)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-[6px] text-[#3f3f46] hover:text-[#71717a] hover:bg-white/[0.03] transition-all text-[12px] mt-auto shrink-0"
        >
          <Icon className="w-3.5 h-3.5" stroke={2} path="M12 5v14M5 12h14" />
          Agregar tarea
        </button>
      </div>
    </div>
  )
}

// ─── KanbanView ───────────────────────────────────────────────────────────────

function KanbanView({ tasks, colorMap, onAdd, onEdit, onUpdate, onDelete, activeId }) {
  function getColTasks(colId) {
    return tasks.filter(t => {
      if (colId === 'pending') return t.status === 'pending' || t.status === 'overdue'
      return t.status === colId
    })
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {COLUMNS.map(col => (
        <KanbanColumn
          key={col.id}
          col={col}
          tasks={getColTasks(col.id)}
          colorMap={colorMap}
          onAdd={onAdd}
          onEdit={onEdit}
          onUpdate={onUpdate}
          onDelete={onDelete}
          activeId={activeId}
        />
      ))}
    </div>
  )
}

// ─── TableRow ─────────────────────────────────────────────────────────────────

function TableRow({ task, colorMap, index, onEdit, onUpdate, onDelete }) {
  const days   = daysUntil(task.due_date)
  const dayLbl = daysLabel(days, task.status)
  const status = STATUS_META[task.status] || STATUS_META.pending
  const pri    = PRIORITY_META[task.priority] || PRIORITY_META.medium
  const prodColor = task.product_name ? (colorMap[task.product_name] || '#6b7280') : null

  return (
    <tr
      className={`border-b border-[#232326] transition-colors cursor-pointer group ${
        index % 2 === 0 ? 'bg-[#18181b]' : 'bg-[#1c1c1f]'
      } hover:bg-[#27272a]`}
      onClick={() => onEdit(task)}
    >
      {/* Checkbox */}
      <td className="w-9 pl-3 py-3" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onUpdate(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' })}
          className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${
            task.status === 'completed'
              ? 'bg-[#10b981] border-[#10b981]'
              : 'border-[#3a3a3e] hover:border-[#10b981]/60'
          }`}
        >
          {task.status === 'completed' && <Icon className="w-2.5 h-2.5 text-white" stroke={3} path="m5 12 4 4 10-9" />}
        </button>
      </td>

      {/* Title */}
      <td className="py-3 pr-4 min-w-[180px]">
        <p className={`text-[13px] font-medium leading-snug ${task.status === 'completed' ? 'line-through text-[#4a4a52]' : 'text-[#e4e4e7]'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-[11px] text-[#52525b] mt-0.5 truncate max-w-[260px]">{task.description}</p>
        )}
      </td>

      {/* Status */}
      <td className="py-3 pr-4 w-[130px]">
        <span
          className="text-[11px] px-2 py-1 rounded-[5px] font-semibold"
          style={{ background: `${status.color}18`, color: status.color }}
        >
          {status.label}
        </span>
      </td>

      {/* Priority */}
      <td className="py-3 pr-4 w-[100px]">
        <span
          className="text-[11px] px-2 py-1 rounded-[5px] font-medium"
          style={{ background: `${pri.color}15`, color: pri.color }}
        >
          {pri.label}
        </span>
      </td>

      {/* Product */}
      <td className="py-3 pr-4 w-[140px]">
        {prodColor ? (
          <span
            className="text-[11px] px-2 py-1 rounded-[5px] font-medium truncate max-w-[130px] inline-block"
            style={{ background: `${prodColor}18`, color: prodColor }}
          >
            {task.product_name}
          </span>
        ) : (
          <span className="text-[#3f3f46] text-[12px]">—</span>
        )}
      </td>

      {/* Due date */}
      <td className="py-3 pr-4 w-[110px]">
        {task.due_date ? (
          <span className={`text-[12px] tabular-nums ${
            days !== null && days < 0 ? 'text-[#ef4444]' : days === 0 ? 'text-[#f59e0b]' : 'text-[#a1a1aa]'
          }`}>
            {fmtDate(task.due_date)}
          </span>
        ) : (
          <span className="text-[#3f3f46] text-[12px]">—</span>
        )}
      </td>

      {/* Days remaining */}
      <td className="py-3 pr-4 w-[130px]">
        {dayLbl && (
          <span className={`text-[12px] ${dayLbl.cls}`}>{dayLbl.text}</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 w-[72px]" onClick={e => e.stopPropagation()}>
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button
            onClick={() => onEdit(task)}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#52525b] hover:text-[#a1a1aa] hover:bg-white/[0.05] transition-all"
          >
            <Icon className="w-3.5 h-3.5" path="m16.86 4.49-.7-.7a2 2 0 0 0-2.83 0L4 13.12V17h3.88l9.33-9.33a2 2 0 0 0 0-2.83z" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
          >
            <Icon className="w-3.5 h-3.5" path="M6 7h12m-9 0V5h6v2m-7 0 1 12h8l1-12" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── TableView ────────────────────────────────────────────────────────────────

function TableView({ tasks, colorMap, onEdit, onUpdate, onDelete }) {
  const [sortCol, setSortCol] = useState('due_date')
  const [sortDir, setSortDir] = useState('asc')

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const cols = [
    { key: 'title',        label: 'Tarea',          w: '' },
    { key: 'status',       label: 'Estado',         w: 'w-[130px]' },
    { key: 'priority',     label: 'Prioridad',      w: 'w-[100px]' },
    { key: 'product_name', label: 'Producto',       w: 'w-[140px]' },
    { key: 'due_date',     label: 'Vencimiento',    w: 'w-[110px]' },
    { key: 'days',         label: 'Días restantes', w: 'w-[130px]' },
    { key: null,           label: '',               w: 'w-[72px]' },
  ]

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let av, bv
      if (sortCol === 'days') {
        av = daysUntil(a.due_date) ?? 9999
        bv = daysUntil(b.due_date) ?? 9999
      } else if (sortCol === 'priority') {
        const order = { high: 0, medium: 1, low: 2 }
        av = order[a.priority] ?? 1
        bv = order[b.priority] ?? 1
      } else if (sortCol === 'status') {
        const order = { overdue: 0, pending: 1, in_progress: 2, reviewing: 3, completed: 4 }
        av = order[a.status] ?? 1
        bv = order[b.status] ?? 1
      } else {
        av = (a[sortCol] ?? '').toString().toLowerCase()
        bv = (b[sortCol] ?? '').toString().toLowerCase()
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [tasks, sortCol, sortDir])

  return (
    <div className="bg-[#18181b] border border-[#2a2a2e] rounded-[10px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-[#2a2a2e]">
              <th className="w-9 pl-3 py-2.5" />
              {cols.map(col => (
                <th
                  key={col.key ?? col.label}
                  className={`text-left px-3 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#3f3f46] font-semibold ${col.w} ${col.key ? 'cursor-pointer hover:text-[#71717a] select-none' : ''}`}
                  onClick={() => col.key && toggleSort(col.key)}
                >
                  {col.label}
                  {col.key === sortCol && (
                    <span className="ml-1 text-[#f5b641]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-14 text-center text-[#3f3f46] text-[13px]">
                  Sin tareas que mostrar
                </td>
              </tr>
            ) : (
              sorted.map((task, index) => (
                <TableRow
                  key={task.id}
                  task={task}
                  colorMap={colorMap}
                  index={index}
                  onEdit={onEdit}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── CalendarView ─────────────────────────────────────────────────────────────

function CalendarView({ tasks, colorMap, onEdit }) {
  const [current, setCurrent] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selected, setSelected] = useState(null)

  const { year, month } = current
  const today = todayStr()
  const monthLabel = new Date(year, month, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const firstDow   = new Date(year, month, 1).getDay()
  const daysCount  = new Date(year, month + 1, 0).getDate()

  const taskMap = useMemo(() => {
    const map = {}
    tasks.forEach(task => {
      if (!task.due_date) return
      const d = task.due_date.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(task)
    })
    return map
  }, [tasks])

  const cells = useMemo(() => {
    const arr = []
    for (let i = 0; i < firstDow; i++) arr.push(null)
    for (let d = 1; d <= daysCount; d++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      arr.push({ day: d, date, tasks: taskMap[date] || [] })
    }
    return arr
  }, [year, month, firstDow, daysCount, taskMap])

  const selectedTasks = selected ? (taskMap[selected] || []) : []

  return (
    <div className="flex gap-4 items-start">
      {/* Calendar */}
      <div className="flex-1 min-w-0">
        {/* Nav */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCurrent(c => {
              const d = new Date(c.year, c.month - 1, 1)
              return { year: d.getFullYear(), month: d.getMonth() }
            })}
            className="w-8 h-8 rounded-[8px] border border-[#2a2a2e] flex items-center justify-center text-[#71717a] hover:text-white hover:border-[#3a3a3e] transition-all"
          >
            <Icon className="w-4 h-4" path="M15 19l-7-7 7-7" />
          </button>
          <h3 className="text-white font-semibold text-[14px] capitalize">{monthLabel}</h3>
          <button
            onClick={() => setCurrent(c => {
              const d = new Date(c.year, c.month + 1, 1)
              return { year: d.getFullYear(), month: d.getMonth() }
            })}
            className="w-8 h-8 rounded-[8px] border border-[#2a2a2e] flex items-center justify-center text-[#71717a] hover:text-white hover:border-[#3a3a3e] transition-all"
          >
            <Icon className="w-4 h-4" path="M9 5l7 7-7 7" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10.5px] text-[#3f3f46] uppercase tracking-[0.12em] py-1.5 font-semibold">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => (
            <div
              key={i}
              className={`min-h-[76px] rounded-[8px] p-1.5 transition-colors ${
                cell
                  ? `cursor-pointer ${cell.date === today ? 'ring-1 ring-[#f5b641] bg-[#f5b641]/[0.04]' : 'bg-[#1c1c1f] hover:bg-[#222228]'} ${cell.date === selected ? 'ring-1 ring-[#8b5cf6]' : ''}`
                  : 'bg-transparent'
              }`}
              onClick={() => cell && setSelected(s => s === cell.date ? null : cell.date)}
            >
              {cell && (
                <>
                  <p className={`text-[12px] font-semibold leading-none ${
                    cell.date === today ? 'text-[#f5b641]' : 'text-[#52525b]'
                  }`}>
                    {cell.day}
                  </p>
                  <div className="flex flex-col gap-0.5 mt-1.5">
                    {cell.tasks.slice(0, 3).map(task => {
                      const pri = PRIORITY_META[task.priority] || PRIORITY_META.medium
                      return (
                        <div
                          key={task.id}
                          className="text-[10px] px-1 py-0.5 rounded-[3px] truncate leading-tight font-medium"
                          style={{ background: `${pri.color}20`, color: pri.color }}
                          onClick={e => { e.stopPropagation(); onEdit(task) }}
                        >
                          {task.title}
                        </div>
                      )
                    })}
                    {cell.tasks.length > 3 && (
                      <p className="text-[10px] text-[#52525b]">+{cell.tasks.length - 3}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Side panel */}
      {selected && (
        <div className="w-[280px] shrink-0 bg-[#1c1c1f] border border-[#2a2a2e] rounded-[10px] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-[13px] capitalize">{fmtDateLong(selected)}</p>
            <button
              onClick={() => setSelected(null)}
              className="w-6 h-6 rounded-[5px] flex items-center justify-center text-[#52525b] hover:text-white hover:bg-white/[0.05]"
            >
              <Icon className="w-3.5 h-3.5" path="M6 6l12 12M18 6 6 18" />
            </button>
          </div>
          {selectedTasks.length === 0 ? (
            <p className="text-[#3f3f46] text-[12px]">Sin tareas este día</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedTasks.map(task => {
                const pri = PRIORITY_META[task.priority] || PRIORITY_META.medium
                return (
                  <button
                    key={task.id}
                    onClick={() => onEdit(task)}
                    className="w-full text-left rounded-[7px] bg-[#222228] hover:bg-[#28282e] p-2.5 transition-colors border-l-2"
                    style={{ borderLeftColor: pri.color }}
                  >
                    <p className="text-[#e4e4e7] text-[13px] font-medium leading-snug">{task.title}</p>
                    {task.product_name && (
                      <p className="text-[#52525b] text-[11px] mt-1">{task.product_name}</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── TaskModal ────────────────────────────────────────────────────────────────

function TaskModal({ task, initialStatus, products, colorMap, onClose, onSaved, onDeleted }) {
  const { addToast } = useToast()
  const isEdit = Boolean(task)

  // Normalize overdue → pending for display
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
      const payload = {
        ...form,
        product_id: form.product_id || null,
        due_date:   form.due_date   || null,
      }
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[560px] bg-[#1c1c1f] border border-[#2a2a2e] rounded-[16px] shadow-[0_32px_64px_rgba(0,0,0,0.6)] animate-fade-up overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'modalIn 0.18s cubic-bezier(0.2,0,0,1) both' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#232326]">
          <p className="text-[#a1a1aa] text-[11px] uppercase tracking-[0.22em] font-semibold">
            {isEdit ? 'Editar tarea' : 'Nueva tarea'}
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[#52525b] hover:text-[#a1a1aa] hover:bg-white/[0.05] transition-all"
          >
            <Icon className="w-4 h-4" path="M6 6l12 12M18 6 6 18" />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="px-5 py-4 space-y-4">
            {/* Title */}
            <div>
              <input
                required
                value={form.title}
                onChange={upd('title')}
                placeholder="Nombre de la tarea"
                className="w-full bg-transparent text-white text-[18px] font-semibold placeholder:text-[#3f3f46] focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <textarea
                value={form.description}
                onChange={upd('description')}
                rows={2}
                placeholder="Descripción (opcional)"
                className="w-full bg-[#222228] border border-[#2e2e32] rounded-[8px] px-3 py-2.5 text-[13px] text-white placeholder:text-[#3f3f46] resize-none focus:outline-none focus:border-[#3a3a3e] transition-colors"
              />
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#52525b] font-semibold mb-2">Estado</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLUMNS.map(col => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => set('status', col.id)}
                      className="text-[12px] px-2.5 py-1.5 rounded-[6px] font-semibold transition-all border"
                      style={form.status === col.id ? {
                        background: `${col.color}22`,
                        color: col.color,
                        borderColor: `${col.color}40`,
                      } : { background: 'transparent', color: '#52525b', borderColor: '#2a2a2e' }}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#52525b] font-semibold mb-2">Prioridad</p>
                <div className="flex gap-1.5">
                  {Object.entries(PRIORITY_META).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set('priority', key)}
                      className="flex-1 text-[12px] py-1.5 rounded-[6px] font-semibold transition-all border"
                      style={form.priority === key ? {
                        background: `${meta.color}20`,
                        color: meta.color,
                        borderColor: `${meta.color}38`,
                      } : { background: 'transparent', color: '#52525b', borderColor: '#2a2a2e' }}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#52525b] font-semibold mb-2">Producto</p>
                <select
                  value={form.product_id}
                  onChange={upd('product_id')}
                  className="w-full bg-[#222228] border border-[#2e2e32] rounded-[8px] px-3 py-2.5 text-[13px] text-[#a1a1aa] focus:outline-none focus:border-[#3a3a3e] transition-colors"
                >
                  <option value="">General</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#52525b] font-semibold mb-2">Vencimiento</p>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={upd('due_date')}
                  className="w-full bg-[#222228] border border-[#2e2e32] rounded-[8px] px-3 py-2.5 text-[13px] text-[#a1a1aa] focus:outline-none focus:border-[#3a3a3e] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-[#232326] gap-3">
            <div className="flex items-center gap-2">
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/8 text-[12px] font-medium transition-all disabled:opacity-40"
                >
                  <Icon className="w-3.5 h-3.5" path="M6 7h12m-9 0V5h6v2m-7 0 1 12h8l1-12" />
                  Eliminar
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-[8px] border border-[#2a2a2e] text-[#71717a] hover:text-[#a1a1aa] text-[13px] font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-[8px] bg-[linear-gradient(135deg,#f5b641_0%,#ffcf73_100%)] text-[#08111f] text-[13px] font-bold disabled:opacity-50 hover:brightness-105 transition-all"
              >
                {loading ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Tasks() {
  const { addToast } = useToast()
  const [tasks,    setTasks]    = useState([])
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState('kanban')
  const [search,   setSearch]   = useState('')
  const [filterProd, setFilterProd] = useState('')
  const [filterPri,  setFilterPri]  = useState('')
  const [modal,    setModal]    = useState(null) // null | { task?, status? }
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 220, tolerance: 6 } }),
  )

  useEffect(() => {
    Promise.all([axios.get('/api/tasks'), axios.get('/api/products')])
      .then(([tr, pr]) => { setTasks(tr.data); setProducts(pr.data) })
      .finally(() => setLoading(false))
  }, [])

  // ── Product color map
  const colorMap = useMemo(() => {
    const map = {}
    products.forEach((p, i) => { map[p.name] = PRODUCT_COLORS[i % PRODUCT_COLORS.length] })
    return map
  }, [products])

  // ── Filtered tasks
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterProd && t.product_name !== filterProd) return false
      if (filterPri  && t.priority !== filterPri)  return false
      return true
    })
  }, [tasks, search, filterProd, filterPri])

  // ── Handlers
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

  // ── DnD handlers
  function handleDragStart({ active }) {
    setActiveId(active.id)
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    if (!task) return

    let colId = String(over.id)

    // If dropped over another card, find which column that card belongs to
    if (!COLUMNS.find(c => c.id === colId)) {
      const overId = typeof over.id === 'number' ? over.id : parseInt(over.id, 10)
      const overTask = tasks.find(t => t.id === overId)
      if (!overTask) return
      colId = overTask.status === 'overdue' ? 'pending' : overTask.status
    }

    const currentColId = task.status === 'overdue' ? 'pending' : task.status
    if (colId !== currentColId) {
      handleUpdate(task.id, { status: colId })
    }
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  // ── Unique product names for filter
  const productNames = useMemo(() => {
    const names = [...new Set(tasks.map(t => t.product_name).filter(Boolean))]
    return names.sort()
  }, [tasks])

  if (loading) {
    return (
      <Layout>
        <div className="space-y-3">
          <div className="skeleton h-[48px] rounded-[10px]" />
          <div className="skeleton h-[40px] rounded-[10px]" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-[480px] rounded-[10px]" />)}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>

      <div className="flex flex-col gap-3 max-w-[1560px] mx-auto overflow-x-hidden">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="font-display text-[22px] font-bold text-white tracking-tight">Tareas</h1>

            {/* Tab bar */}
            <div className="flex items-center bg-[#1c1c1f] border border-[#2a2a2e] rounded-[10px] p-1 gap-0.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12.5px] font-semibold transition-all ${
                    view === tab.id
                      ? 'bg-[#2a2a2e] text-white'
                      : 'text-[#52525b] hover:text-[#a1a1aa]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" path={tab.icon} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Link to stats */}
            <Link
              to="/tareas/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border border-[#2a2a2e] text-[#52525b] hover:text-[#a1a1aa] hover:border-[#3a3a3e] text-[12px] font-medium transition-all"
            >
              <Icon className="w-3.5 h-3.5" path="M5 19V9m7 10V5m7 14v-7M3 19h18" />
              Estadísticas
            </Link>
          </div>

          <button
            onClick={() => setModal({ status: 'pending' })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-[linear-gradient(135deg,#f5b641_0%,#ffcf73_100%)] text-[#08111f] text-[13px] font-bold hover:brightness-105 transition-all shrink-0"
          >
            <Icon className="w-3.5 h-3.5" stroke={2.5} path="M12 5v14M5 12h14" />
            Nueva tarea
          </button>
        </div>

        {/* ── Filters row ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Icon
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#3f3f46]"
              path="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tareas..."
              className="w-full bg-[#1c1c1f] border border-[#2a2a2e] rounded-[8px] pl-8 pr-3 py-2 text-[12.5px] text-white placeholder:text-[#3f3f46] focus:outline-none focus:border-[#3a3a3e] transition-colors"
            />
          </div>

          {/* Product filter */}
          <select
            value={filterProd}
            onChange={e => setFilterProd(e.target.value)}
            className="bg-[#1c1c1f] border border-[#2a2a2e] rounded-[8px] px-3 py-2 text-[12.5px] text-[#a1a1aa] focus:outline-none focus:border-[#3a3a3e] transition-colors"
          >
            <option value="">Todos los productos</option>
            {productNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Priority filter */}
          <select
            value={filterPri}
            onChange={e => setFilterPri(e.target.value)}
            className="bg-[#1c1c1f] border border-[#2a2a2e] rounded-[8px] px-3 py-2 text-[12.5px] text-[#a1a1aa] focus:outline-none focus:border-[#3a3a3e] transition-colors"
          >
            <option value="">Todas las prioridades</option>
            {Object.entries(PRIORITY_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Task count */}
          <span className="text-[12px] text-[#3f3f46] ml-1">
            {filtered.length} {filtered.length === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {tasks.length === 0 && (
          <div className="bg-[#1c1c1f] border border-[#2a2a2e] rounded-[12px] py-16 text-center">
            <div className="w-12 h-12 rounded-[14px] mx-auto bg-[#f5b641]/10 border border-[#f5b641]/20 flex items-center justify-center text-[#f5b641] mb-4">
              <Icon className="w-6 h-6" path="M4 5h16v14H4zM9 5v14M15 5v8" />
            </div>
            <p className="text-white font-semibold text-[15px]">Sin tareas todavía</p>
            <p className="text-[#52525b] text-[13px] mt-1.5">Crea tu primera tarea para empezar a organizar el trabajo</p>
            <button
              onClick={() => setModal({ status: 'pending' })}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-[9px] bg-[linear-gradient(135deg,#f5b641_0%,#ffcf73_100%)] text-[#08111f] font-bold text-[13px]"
            >
              <Icon className="w-4 h-4" stroke={2.2} path="M12 5v14M5 12h14" />
              Crear primera tarea
            </button>
          </div>
        )}

        {/* ── Views ───────────────────────────────────────────────────────── */}
        {tasks.length > 0 && view === 'kanban' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <KanbanView
              tasks={filtered}
              colorMap={colorMap}
              onAdd={status => setModal({ status })}
              onEdit={task => setModal({ task })}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              activeId={activeId}
            />
            <DragOverlay dropAnimation={null}>
              {activeTask && (
                <KanbanCard
                  task={activeTask}
                  colorMap={colorMap}
                  onEdit={() => {}}
                  onUpdate={() => {}}
                  onDelete={() => {}}
                  isOverlay
                />
              )}
            </DragOverlay>
          </DndContext>
        )}

        {tasks.length > 0 && view === 'table' && (
          <TableView
            tasks={filtered}
            colorMap={colorMap}
            onEdit={task => setModal({ task })}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}

        {tasks.length > 0 && view === 'calendar' && (
          <CalendarView
            tasks={filtered}
            colorMap={colorMap}
            onEdit={task => setModal({ task })}
          />
        )}
      </div>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      {modal && (
        <TaskModal
          task={modal.task}
          initialStatus={modal.status}
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
