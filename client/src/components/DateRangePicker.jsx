import { useState, useRef, useEffect } from 'react'
import { useDateRange, PRESETS } from '../context/DateRangeContext'

function fmtDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`
}

export default function DateRangePicker() {
  const { dateFrom, dateTo, label, applyPreset, applyCustom } = useDateRange()
  const [open,      setOpen]      = useState(false)
  const [tempFrom,  setTempFrom]  = useState(dateFrom)
  const [tempTo,    setTempTo]    = useState(dateTo)
  const [activeKey, setActiveKey] = useState('30d')
  const ref = useRef(null)

  // Cerrar al click fuera
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function selectPreset(key) {
    setActiveKey(key)
    applyPreset(key)
    setOpen(false)
  }

  function applyCustomRange() {
    if (!tempFrom || !tempTo) return
    applyCustom(tempFrom, tempTo)
    setActiveKey('')
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-[#1f1f23] border border-[#2a2a2e] hover:border-[#E8A020]/40 text-white text-sm font-medium transition-all"
      >
        <svg className="w-4 h-4 text-[#E8A020] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="hidden sm:inline text-[#a1a1aa] text-xs mr-0.5">📅</span>
        <span className="text-xs sm:text-sm">{fmtDisplay(dateFrom)} – {fmtDisplay(dateTo)}</span>
        <svg className={`w-3.5 h-3.5 text-[#52525b] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 animate-fade-up"
          style={{ minWidth: 460, maxWidth: '95vw' }}>
          <div className="card shadow-2xl overflow-hidden">
            <div className="flex">
              {/* Columna izquierda: presets */}
              <div className="w-44 border-r border-[#2a2a2e] py-2 shrink-0">
                <p className="text-[#52525b] text-[10px] font-semibold tracking-widest uppercase px-4 py-2">
                  RANGO RÁPIDO
                </p>
                {PRESETS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => selectPreset(p.key)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeKey === p.key
                        ? 'bg-[#E8A020]/10 text-[#E8A020] font-medium'
                        : 'text-[#a1a1aa] hover:text-white hover:bg-[#1f1f23]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Columna derecha: rango personalizado */}
              <div className="flex-1 p-4 space-y-4">
                <p className="text-[#52525b] text-[10px] font-semibold tracking-widest uppercase">
                  RANGO PERSONALIZADO
                </p>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[#a1a1aa] text-xs font-medium">Desde</label>
                    <input
                      type="date"
                      value={tempFrom}
                      onChange={e => setTempFrom(e.target.value)}
                      className="w-full bg-[#0B0B0E] border border-[#2a2a2e] text-white text-sm px-3 py-2 rounded-[10px] focus:outline-none focus:border-[#E8A020]/60 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[#a1a1aa] text-xs font-medium">Hasta</label>
                    <input
                      type="date"
                      value={tempTo}
                      min={tempFrom}
                      onChange={e => setTempTo(e.target.value)}
                      className="w-full bg-[#0B0B0E] border border-[#2a2a2e] text-white text-sm px-3 py-2 rounded-[10px] focus:outline-none focus:border-[#E8A020]/60 transition-colors"
                    />
                  </div>
                </div>

                {/* Vista previa */}
                {tempFrom && tempTo && (
                  <div className="bg-[#0B0B0E] border border-[#2a2a2e] rounded-[10px] px-3 py-2">
                    <p className="text-[#52525b] text-xs">Seleccionado</p>
                    <p className="text-white text-sm font-medium mt-0.5">
                      {fmtDisplay(tempFrom)} → {fmtDisplay(tempTo)}
                    </p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2 rounded-[10px] border border-[#2a2a2e] text-[#a1a1aa] text-sm hover:text-white hover:border-[#3a3a3e] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={applyCustomRange}
                    disabled={!tempFrom || !tempTo}
                    className="flex-1 py-2 rounded-[10px] bg-[#E8A020] hover:bg-[#d4911c] text-black text-sm font-semibold transition-colors disabled:opacity-40"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
