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
  { id: 'kanban',    label: 'Kanban',       icon: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18' },
  { id: 'productos', label: 'Por producto', icon: 'M12 2l9 5v10l-9 5-9-5V7l9-5zm0 0v18m9-13L12 12 3 7' },
  { id: 'table',     label: 'Tabla',        icon: 'M3 10h18M3 14h18M10 3v18M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z' },
  { id: 'calendar',  label: 'Calendario',   icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
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
      className={`group relative rounded-[10px] overflow-hidden select-none transition-all duration-150 ${
        isCompleted
          ? 'opacity-45 border border-white/[0.05]'
          : isOverdue
          ? 'border border-[#F87171]/30 hover:border-[#F87171]/50'
          : 'border border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.035]'
      } ${isOverlay ? 'shadow-[0_16px_40px_rgba(0,0,0,0.65)] scale-[1.02]' : ''}`}
      style={{ background: isCompleted ? 'rgba(255,255,255,0.015)' : isOverdue ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.025)' }}
    >
      {/* Priority left bar — thicker, stronger */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ background: pri.color, opacity: isCompleted ? 0.3 : 1 }} />

      <div className="pl-3.5 pr-2.5 pt-2.5 pb-2">
        {/* Title row */}
        <div className="flex items-start gap-1.5">
          <button
            {...attributes}
            {...listeners}
            className="mt-[3px] text-[#2e2e38] hover:text-[#56566A] cursor-grab active:cursor-grabbing shrink-0 touch-none"
            onClick={e => e.stopPropagation()}
            tabIndex={-1}
          >
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="7" cy="5" r="1.3" /><circle cx="13" cy="5" r="1.3" />
              <circle cx="7" cy="10" r="1.3" /><circle cx="13" cy="10" r="1.3" />
              <circle cx="7" cy="15" r="1.3" /><circle cx="13" cy="15" r="1.3" />
            </svg>
          </button>
          <button className="flex-1 text-left" onClick={() => onEdit(task)}>
            <p className={`text-[13px] font-semibold leading-snug ${isCompleted ? 'line-through text-[#3a3a46]' : 'text-white'}`}>
              {task.title}
            </p>
          </button>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 mt-2 pl-4 flex-wrap">
          {prodColor && (
            <span className="text-[10.5px] px-1.5 py-[2px] rounded-[4px] font-medium truncate max-w-[110px]" style={{ background: `${prodColor}1C`, color: prodColor }}>
              {task.product_name}
            </span>
          )}
          {isOverdue && (
            <span className="text-[10.5px] px-1.5 py-[2px] rounded-[4px] font-semibold" style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171' }}>
              Vencida
            </span>
          )}
          <span className="text-[10.5px] px-1.5 py-[2px] rounded-[4px] font-semibold ml-auto shrink-0" style={{ background: `${pri.color}1C`, color: pri.color }}>
            {pri.label}
          </span>
        </div>

        {/* Date + actions row */}
        <div className="flex items-center justify-between mt-1.5 pl-4">
          {dayLbl ? (
            <span className={`text-[11px] tabular-nums font-medium ${dayLbl.cls}`}>
              {task.due_date ? `${fmtDate(task.due_date)} · ` : ''}{dayLbl.text}
            </span>
          ) : (
            <span className="text-[11px] font-medium" style={{ color: '#34D399' }}>✓ Listo</span>
          )}
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            {!isCompleted && (
              <button onClick={e => { e.stopPropagation(); onUpdate(task.id, { status: 'completed' }) }} title="Listo"
                className="w-5 h-5 rounded flex items-center justify-center text-[#3a3a42] hover:text-[#34D399] hover:bg-[#34D399]/12 transition-all">
                <Icon className="w-3 h-3" stroke={2.5} path="m5 12 4 4 10-9" />
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); onEdit(task) }} title="Editar"
              className="w-5 h-5 rounded flex items-center justify-center text-[#3a3a42] hover:text-[#a0a0b0] hover:bg-white/[0.06] transition-all">
              <Icon className="w-2.5 h-2.5" path="m16.86 4.49-.7-.7a2 2 0 0 0-2.83 0L4 13.12V17h3.88l9.33-9.33a2 2 0 0 0 0-2.83z" />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(task.id) }} title="Eliminar"
              className="w-5 h-5 rounded flex items-center justify-center text-[#3a3a42] hover:text-[#F87171] hover:bg-[#F87171]/10 transition-all">
              <Icon className="w-3 h-3" path="M6 7h12m-9 0V5h6v2m-7 0 1 12h8l1-12" />
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
      {/* Column header */}
      <div className="px-2 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
          <span className="text-white font-semibold text-[12px]">{col.label}</span>
          <span className="text-[10.5px] font-bold px-1.5 py-[1px] rounded-[4px] tabular-nums leading-none"
            style={{ background: `${col.color}20`, color: col.color }}>
            {tasks.length}
          </span>
        </div>
        <button onClick={() => onAdd(col.id)} title="Agregar"
          className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[#3a3a46] hover:text-[#a0a0b0] hover:bg-white/[0.06] transition-all">
          <Icon className="w-3 h-3" stroke={2.5} path="M12 5v14M5 12h14" />
        </button>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-[12px] p-1.5 flex flex-col gap-1.5 overflow-y-auto transition-colors duration-100 ${
          isOver ? 'bg-white/[0.05]' : 'bg-white/[0.02]'
        }`}
        style={{
          maxHeight: 'calc(100vh - 210px)',
          border: isOver ? `1px solid ${col.color}40` : '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {tasks.length === 0 && !activeId && (
          <div className="flex items-center justify-center h-14 text-[11px] border border-dashed border-white/[0.06] rounded-[8px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
            Sin tareas
          </div>
        )}
        {activeId && tasks.length === 0 && isOver && (
          <div className="h-14 border-2 border-dashed rounded-[8px] transition-colors" style={{ borderColor: col.color + '50' }} />
        )}
        {tasks.map(task => (
          <KanbanCard key={task.id} task={task} colorMap={colorMap} onEdit={onEdit} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
        <button onClick={() => onAdd(col.id)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-[6px] text-[#3a3a46] hover:text-[#56566A] hover:bg-white/[0.03] transition-all text-[11.5px] mt-auto shrink-0">
          <Icon className="w-3 h-3" stroke={2} path="M12 5v14M5 12h14" />
          Agregar
        </button>
      </div>
    </div>
  )
}

// ─── KanbanView ───────────────────────────────────────────────────────────────

function KanbanView({ tasks, colorMap, onAdd, onEdit, onUpdate, onDelete, activeId, showCompleted, onToggleCompleted }) {
  const visibleCols = showCompleted ? COLUMNS : COLUMNS.filter(c => c.id !== 'completed')

  function getColTasks(colId) {
    return tasks.filter(t => {
      if (colId === 'pending') return t.status === 'pending' || t.status === 'overdue'
      return t.status === colId
    })
  }

  const completedCount = tasks.filter(t => t.status === 'completed').length

  return (
    <div>
      <div className={`grid gap-3 ${showCompleted ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {visibleCols.map(col => (
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
      {/* Toggle completed */}
      <div className="mt-3 flex justify-start">
        <button
          onClick={onToggleCompleted}
          className="flex items-center gap-1.5 text-[12px] text-[#4a4a56] hover:text-[#8ea0bc] transition-colors py-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCompleted ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'} />
          </svg>
          {showCompleted ? 'Ocultar completadas' : `Mostrar completadas (${completedCount})`}
        </button>
      </div>
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
      className="border-b border-white/[0.06] transition-colors cursor-pointer group hover:bg-white/[0.03]"
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
    <div className="bg-white/[0.025] border border-white/[0.07] rounded-[14px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="w-9 pl-3 py-2.5" />
              {cols.map(col => (
                <th
                  key={col.key ?? col.label}
                  className={`text-left px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-[#4a4a56] font-medium ${col.w} ${col.key ? 'cursor-pointer hover:text-[#8ea0bc] select-none' : ''}`}
                  onClick={() => col.key && toggleSort(col.key)}
                >
                  {col.label}
                  {col.key === sortCol && (
                    <span className="ml-1 text-[#F59E0B]">{sortDir === 'asc' ? '↑' : '↓'}</span>
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
            className="w-8 h-8 rounded-[10px] border border-white/[0.08] flex items-center justify-center text-[#6b7280] hover:text-white hover:border-white/[0.16] transition-all"
          >
            <Icon className="w-4 h-4" path="M15 19l-7-7 7-7" />
          </button>
          <h3 className="text-white font-semibold text-[14px] capitalize">{monthLabel}</h3>
          <button
            onClick={() => setCurrent(c => {
              const d = new Date(c.year, c.month + 1, 1)
              return { year: d.getFullYear(), month: d.getMonth() }
            })}
            className="w-8 h-8 rounded-[10px] border border-white/[0.08] flex items-center justify-center text-[#6b7280] hover:text-white hover:border-white/[0.16] transition-all"
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
              className={`min-h-[76px] rounded-[12px] p-1.5 transition-colors ${
                cell
                  ? `cursor-pointer ${cell.date === today ? 'ring-1 ring-[#F59E0B]/60 bg-[#F59E0B]/[0.06]' : 'bg-white/[0.025] hover:bg-white/[0.05]'} ${cell.date === selected ? 'ring-1 ring-[#8b5cf6]/60' : ''}`
                  : 'bg-transparent'
              }`}
              onClick={() => cell && setSelected(s => s === cell.date ? null : cell.date)}
            >
              {cell && (
                <>
                  <p className={`text-[12px] font-semibold leading-none ${
                    cell.date === today ? 'text-[#F59E0B]' : 'text-[#6b7280]'
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
        <div className="w-[280px] shrink-0 bg-white/[0.025] border border-white/[0.07] rounded-[14px] p-4">
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
                    className="w-full text-left rounded-[10px] bg-white/[0.04] hover:bg-white/[0.07] p-2.5 transition-colors border-l-2"
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
        className="relative w-full max-w-[560px] bg-[#12121A] border border-white/[0.09] rounded-[16px] shadow-[0_32px_64px_rgba(0,0,0,0.65)] animate-fade-up overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'modalIn 0.18s cubic-bezier(0.2,0,0,1) both' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.07]">
          <p className="text-[#8ea0bc] text-[11px] uppercase tracking-[0.16em] font-medium">
            {isEdit ? 'Editar tarea' : 'Nueva tarea'}
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[#52525b] hover:text-[#a1a1aa] hover:bg-white/[0.05] transition-all"
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
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-3 py-2.5 text-[13px] text-white placeholder:text-[#4a4a56] resize-none focus:outline-none focus:border-white/[0.16] transition-colors"
              />
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#6b7280] font-medium mb-2">Estado</p>
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
                      } : { background: 'transparent', color: '#6b7280', borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#6b7280] font-medium mb-2">Prioridad</p>
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
                      } : { background: 'transparent', color: '#6b7280', borderColor: 'rgba(255,255,255,0.08)' }}
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
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#6b7280] font-medium mb-2">Producto</p>
                <select
                  value={form.product_id}
                  onChange={upd('product_id')}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-3 py-2.5 text-[13px] text-[#8ea0bc] focus:outline-none focus:border-white/[0.16] transition-colors"
                >
                  <option value="">General</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#6b7280] font-medium mb-2">Vencimiento</p>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={upd('due_date')}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-3 py-2.5 text-[13px] text-[#8ea0bc] focus:outline-none focus:border-white/[0.16] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.07] gap-3">
            <div className="flex items-center gap-2">
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/8 text-[12px] font-medium transition-all disabled:opacity-40"
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
                className="px-4 py-2 rounded-[10px] border border-white/[0.08] text-[#6b7280] hover:text-[#c0cee4] text-[12.5px] font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-[10px] bg-[#F59E0B] text-black text-[12.5px] font-medium disabled:opacity-50 hover:bg-[#E8A020] transition-all"
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

// ─── Product Task Card ────────────────────────────────────────────────────────

function ProductTaskCard({ name, color, pending, overdue, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-[14px] p-4 border transition-all ${
        active
          ? 'bg-white/[0.06] border-white/[0.16]'
          : 'bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.04] hover:border-white/[0.12]'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
        <p className="text-[13px] font-semibold text-white truncate">{name}</p>
      </div>
      <div className="flex gap-3">
        {pending > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
            <span className="text-[12px] text-[#8ea0bc] tabular-nums">{pending} pend.</span>
          </div>
        )}
        {overdue > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            <span className="text-[12px] text-[#ef4444] tabular-nums font-medium">{overdue} venc.</span>
          </div>
        )}
        {pending === 0 && overdue === 0 && (
          <span className="text-[12px] text-[#22c55e]">✓ Al día</span>
        )}
      </div>
    </button>
  )
}

// ─── By-Product View ──────────────────────────────────────────────────────────

function ProductsView({ tasks, products, colorMap, onEdit }) {
  const today = new Date().toISOString().slice(0, 10)

  function dayLabel(iso) {
    if (!iso) return null
    const diff = Math.ceil((new Date(iso + 'T12:00:00') - new Date(new Date().toDateString())) / 86400000)
    if (diff < 0) return { text: 'Vencida', color: '#F87171' }
    if (diff === 0) return { text: 'Hoy', color: '#F59E0B' }
    if (diff === 1) return { text: 'Mañana', color: '#F59E0B' }
    return {
      text: new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }),
      color: 'rgba(255,255,255,0.35)',
    }
  }

  const activeTasks = tasks.filter(t => t.status !== 'completed')
  const groups = []

  // General
  const gen = activeTasks.filter(t => !t.product_id)
  if (gen.length > 0) groups.push({ key: '__gen', name: 'General', color: '#56566A', tasks: gen })

  // Per product
  products.forEach(p => {
    const pts = activeTasks.filter(t => t.product_id === p.id || t.product_name === p.name)
    if (pts.length > 0) groups.push({ key: p.id, name: p.name, color: colorMap[p.name] || '#818CF8', tasks: pts })
  })

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.30)' }}>No hay tareas activas</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map(g => (
        <div key={g.key} className="rounded-[14px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
            <span className="text-[13px] font-semibold text-white">{g.name}</span>
            <span className="ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded-[4px] tabular-nums"
              style={{ background: `${g.color}20`, color: g.color }}>
              {g.tasks.length}
            </span>
          </div>
          <div>
            {g.tasks.map(t => {
              const lbl = dayLabel(t.due_date)
              const pri = PRIORITY_META[t.priority]
              return (
                <button
                  key={t.id}
                  onClick={() => onEdit(t)}
                  className="w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors hover:bg-white/[0.03]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: pri?.color || '#56566A' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-white leading-snug truncate">{t.title}</p>
                    {lbl && <p className="text-[11px] mt-0.5" style={{ color: lbl.color }}>{lbl.text}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
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
  const [filterProd,   setFilterProd]   = useState('')
  const [filterPri,    setFilterPri]    = useState('')
  const [filterStatus, setFilterStatus] = useState('') // '' | 'pending' | 'overdue' | 'completed'
  const [showCompleted, setShowCompleted] = useState(false)
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

  // ── KPI counts (from all tasks, ignoring current filters)
  const kpiCounts = useMemo(() => ({
    completed: tasks.filter(t => t.status === 'completed').length,
    pending:   tasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'reviewing').length,
    overdue:   tasks.filter(t => t.status === 'overdue').length,
  }), [tasks])

  // ── Per-product task stats
  const productStats = useMemo(() => {
    const map = {}
    tasks.forEach(t => {
      const key = t.product_name || '__general__'
      if (!map[key]) map[key] = { name: t.product_name || 'General', pending: 0, overdue: 0 }
      if (t.status === 'overdue') map[key].overdue++
      else if (t.status !== 'completed') map[key].pending++
    })
    return Object.values(map).filter(s => s.name !== 'General' && (s.pending > 0 || s.overdue > 0))
  }, [tasks])

  // ── Filtered tasks
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterProd && t.product_name !== filterProd) return false
      if (filterPri  && t.priority !== filterPri)  return false
      if (filterStatus === 'completed') return t.status === 'completed'
      if (filterStatus === 'overdue')   return t.status === 'overdue'
      if (filterStatus === 'pending')   return t.status === 'pending' || t.status === 'in_progress' || t.status === 'reviewing'
      return true
    })
  }, [tasks, search, filterProd, filterPri, filterStatus])

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
          <div className="skeleton h-[48px] rounded-[14px]" />
          <div className="skeleton h-[40px] rounded-[14px]" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-[480px] rounded-[14px]" />)}
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

      <div className="flex flex-col gap-2.5 max-w-[1560px] mx-auto overflow-x-hidden">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Title */}
          <h1 className="text-[20px] font-bold text-white shrink-0" style={{ letterSpacing: '-0.03em' }}>
            Tareas
          </h1>

          {/* Tab bar */}
          <div className="flex items-center bg-white/[0.05] border border-white/[0.08] rounded-[8px] p-0.5 gap-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[12px] font-medium transition-all ${
                  view === tab.id
                    ? 'bg-white/[0.10] text-white shadow-sm'
                    : 'text-[#56566A] hover:text-[#a0a0b0]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" path={tab.icon} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Stats link */}
          <Link
            to="/tareas/dashboard"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border border-white/[0.08] text-[#56566A] hover:text-[#a0a0b0] text-[12px] font-medium transition-all"
          >
            <Icon className="w-3.5 h-3.5" path="M5 19V9m7 10V5m7 14v-7M3 19h18" />
            <span className="hidden sm:inline">Stats</span>
          </Link>

          {/* Filters inline */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative min-w-[140px] max-w-[220px] flex-1">
              <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#3f3f46]" path="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[8px] pl-7 pr-3 py-1.5 text-[12px] text-white placeholder:text-[#3f3f46] focus:outline-none focus:border-white/[0.18] transition-colors"
              />
            </div>
            <select
              value={filterProd}
              onChange={e => setFilterProd(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-[8px] px-2.5 py-1.5 text-[12px] text-[#8ea0bc] focus:outline-none focus:border-white/[0.18] transition-colors max-w-[140px]"
            >
              <option value="">Todos los productos</option>
              {productNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select
              value={filterPri}
              onChange={e => setFilterPri(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-[8px] px-2.5 py-1.5 text-[12px] text-[#8ea0bc] focus:outline-none focus:border-white/[0.18] transition-colors max-w-[120px]"
            >
              <option value="">Prioridad</option>
              {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(filterStatus || filterProd || filterPri || search) && (
              <button
                onClick={() => { setFilterStatus(''); setFilterProd(''); setFilterPri(''); setSearch('') }}
                className="flex items-center gap-1 text-[11.5px] text-[#4a4a56] hover:text-[#ef4444] transition-colors shrink-0"
              >
                <Icon className="w-3 h-3" path="M6 6l12 12M18 6 6 18" />
                Limpiar
              </button>
            )}
            <span className="text-[11.5px] text-[#3f3f46] ml-auto shrink-0 tabular-nums">{filtered.length} tareas</span>
          </div>

          {/* Nueva tarea */}
          <button
            onClick={() => setModal({ status: 'pending' })}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[#F59E0B] text-black text-[12.5px] font-semibold hover:bg-[#E8A020] transition-all shrink-0"
          >
            <Icon className="w-3.5 h-3.5" stroke={2.5} path="M12 5v14M5 12h14" />
            Nueva tarea
          </button>
        </div>

        {/* ── KPI cards ───────────────────────────────────────────────────── */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { key: 'completed', label: 'Completadas', count: kpiCounts.completed, color: '#34D399', dimBg: 'rgba(52,211,153,0.08)', dimBorder: 'rgba(52,211,153,0.20)', ringColor: 'rgba(52,211,153,0.30)', icon: 'm5 12 4 4 10-9' },
              { key: 'pending',   label: 'Pendientes',  count: kpiCounts.pending,   color: '#818CF8', dimBg: 'rgba(129,140,248,0.08)', dimBorder: 'rgba(129,140,248,0.20)', ringColor: 'rgba(129,140,248,0.30)', icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
              { key: 'overdue',   label: 'Vencidas',    count: kpiCounts.overdue,   color: '#F87171', dimBg: 'rgba(248,113,113,0.08)', dimBorder: 'rgba(248,113,113,0.20)', ringColor: 'rgba(248,113,113,0.30)', icon: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' },
            ].map(kpi => (
              <button
                key={kpi.key}
                onClick={() => setFilterStatus(s => s === kpi.key ? '' : kpi.key)}
                className="relative text-left rounded-[12px] p-4 border transition-all"
                style={filterStatus === kpi.key
                  ? { background: kpi.dimBg, borderColor: kpi.dimBorder, boxShadow: `0 0 0 1px ${kpi.ringColor}` }
                  : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }
                }
                onMouseEnter={e => { if (filterStatus !== kpi.key) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (filterStatus !== kpi.key) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                {/* Icon + label row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: kpi.dimBg, border: `1px solid ${kpi.dimBorder}` }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: kpi.color }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={kpi.icon} />
                    </svg>
                  </div>
                  {filterStatus === kpi.key && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px]" style={{ background: `${kpi.color}22`, color: kpi.color }}>
                      filtro activo
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] uppercase tracking-[0.14em] font-semibold mb-1.5" style={{ color: kpi.color }}>{kpi.label}</p>
                <p className="text-[36px] font-bold tabular-nums leading-none text-white" style={{ letterSpacing: '-0.04em' }}>{kpi.count}</p>
              </button>
            ))}
          </div>
        )}

        {/* ── Product dashboard grid ──────────────────────────────────────── */}
        {tasks.length > 0 && productStats.length > 0 && !filterStatus && !filterProd && !search && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#4f6278] font-medium mb-2">Por producto</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {productStats.map(stat => (
                <ProductTaskCard
                  key={stat.name}
                  name={stat.name}
                  color={colorMap[stat.name] || '#6b7280'}
                  pending={stat.pending}
                  overdue={stat.overdue}
                  active={filterProd === stat.name}
                  onClick={() => setFilterProd(p => p === stat.name ? '' : stat.name)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {tasks.length === 0 && (
          <div className="bg-white/[0.025] border border-white/[0.07] rounded-[14px] py-16 text-center">
            <div className="w-12 h-12 rounded-[14px] mx-auto bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B] mb-4">
              <Icon className="w-6 h-6" path="M4 5h16v14H4zM9 5v14M15 5v8" />
            </div>
            <p className="text-white font-medium text-[14px]">Sin tareas todavía</p>
            <p className="text-[#6b7280] text-[12px] mt-1.5">Crea tu primera tarea para empezar a organizar el trabajo</p>
            <button
              onClick={() => setModal({ status: 'pending' })}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2 rounded-[10px] bg-[#F59E0B] text-black font-medium text-[13px] hover:bg-[#E8A020] transition-all"
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
              showCompleted={showCompleted || filterStatus === 'completed'}
              onToggleCompleted={() => setShowCompleted(s => !s)}
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

        {tasks.length > 0 && view === 'productos' && (
          <ProductsView
            tasks={tasks}
            products={products}
            colorMap={colorMap}
            onEdit={task => setModal({ task })}
          />
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
