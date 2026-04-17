import { useState } from 'react'
import axios from 'axios'
import Layout from '../components/Layout'
import { usePreferences } from '../context/PreferencesContext'
import { useToast } from '../context/ToastContext'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#F59E0B]' : 'bg-white/[0.10]'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: 'rgba(255,255,255,0.30)' }}>
      {children}
    </p>
  )
}

function FieldRow({ title, description, children }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[13px] font-semibold text-white">{title}</p>
        <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.40)' }}>{description}</p>
      </div>
      {children}
    </div>
  )
}

function OptionButton({ active, onClick, label, note }) {
  return (
    <button
      onClick={onClick}
      className="rounded-[8px] border px-4 py-3 text-left transition-all"
      style={active ? {
        borderColor: 'rgba(245,158,11,0.40)',
        background: 'rgba(245,158,11,0.08)',
        color: '#F4F4F6',
      } : {
        borderColor: 'rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        color: 'rgba(255,255,255,0.55)',
      }}
    >
      <p className="text-[13px] font-semibold">{label}</p>
      <p className="text-[11.5px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{note}</p>
    </button>
  )
}

function FieldInput({ value, onChange, ...props }) {
  return (
    <input
      value={value}
      onChange={onChange}
      className="w-full rounded-[8px] px-4 py-2.5 text-[13px] text-white focus:outline-none transition-colors"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
      onFocus={e => e.target.style.borderColor = 'rgba(245,158,11,0.40)'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
      {...props}
    />
  )
}

function FieldSelect({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-[8px] px-4 py-2.5 text-[13px] text-white focus:outline-none transition-colors appearance-none"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {children}
    </select>
  )
}

function DangerButton({ label, note, tone, onClick, disabled }) {
  const isDanger = tone === 'danger'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-[8px] border px-4 py-3 text-left transition-all disabled:opacity-50 w-full"
      style={{
        borderColor: isDanger ? 'rgba(248,113,113,0.20)' : 'rgba(245,158,11,0.20)',
        background: isDanger ? 'rgba(248,113,113,0.05)' : 'rgba(245,158,11,0.05)',
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = isDanger ? 'rgba(248,113,113,0.10)' : 'rgba(245,158,11,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.background = isDanger ? 'rgba(248,113,113,0.05)' : 'rgba(245,158,11,0.05)')}
    >
      <p className="text-[13px] font-semibold text-white">{label}</p>
      <p className="text-[11.5px] mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{note}</p>
    </button>
  )
}

export default function Settings() {
  const { addToast } = useToast()
  const { preferences, updatePreference, updateNotification, formatCurrency, convertAmount } = usePreferences()
  const [deletingScope, setDeletingScope] = useState('')

  async function handleDelete(scope) {
    const labels = {
      accounting: 'borrar los datos contables',
      tasks: 'borrar las tareas',
      all: 'borrar todos los datos',
    }
    if (!window.confirm(`Esta accion no se puede deshacer.\n\nConfirmar ${labels[scope]}.`)) return
    setDeletingScope(scope)
    try {
      const response = await axios.delete('/api/settings/data', { params: { scope } })
      addToast(response.data?.message || 'Datos eliminados', 'success')
    } catch (error) {
      addToast(error.response?.data?.error || 'No se pudo completar la eliminacion', 'error')
    } finally {
      setDeletingScope('')
    }
  }

  const sampleBase = 250000
  const sampleConverted = convertAmount(sampleBase)

  return (
    <Layout>
      <div className="w-full space-y-8">

        {/* Page header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold text-white leading-none" style={{ letterSpacing: '-0.04em' }}>
              Configuracion
            </h1>
            <p className="text-[12.5px] mt-2" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Moneda, tasa de cambio, formato, zona horaria, tema y gestion de datos.
            </p>
          </div>
        </div>

        {/* Main layout: settings (left) + summary (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

          {/* Left: settings fields */}
          <div className="space-y-6">

            {/* Seccion: Visualizacion */}
            <div className="card p-6">
              <SectionLabel>Visualizacion</SectionLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <FieldRow title="Moneda" description="La app convierte montos guardados en ARS a la moneda visual elegida.">
                  <div className="grid grid-cols-2 gap-2">
                    {['USD', 'ARS'].map(currency => (
                      <OptionButton
                        key={currency}
                        active={preferences.currency === currency}
                        onClick={() => updatePreference('currency', currency)}
                        label={currency}
                        note={currency === 'USD' ? 'Dolar estadounidense' : 'Peso argentino'}
                      />
                    ))}
                  </div>
                </FieldRow>

                <FieldRow title="Tasa de cambio" description="ARS por 1 USD, usada en dashboard, graficos y rankings.">
                  <div className="space-y-2">
                    <p className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.35)' }}>ARS por 1 USD</p>
                    <FieldInput
                      type="number"
                      min="1"
                      step="0.01"
                      value={preferences.exchangeRate}
                      onChange={e => updatePreference('exchangeRate', Number(e.target.value) || 1)}
                    />
                    <p className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      Ejemplo: ARS 250.000 = {formatCurrency(sampleBase)}
                    </p>
                  </div>
                </FieldRow>

                <FieldRow title="Formato de numeros" description="Compacto o completo para valores en dashboard y reportes.">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'compact',  label: 'Compacto', note: '1.2K / 2.5M' },
                      { key: 'standard', label: 'Completo', note: '1,250 / 2,500,000' },
                    ].map(opt => (
                      <OptionButton
                        key={opt.key}
                        active={preferences.numberFormat === opt.key}
                        onClick={() => updatePreference('numberFormat', opt.key)}
                        label={opt.label}
                        note={opt.note}
                      />
                    ))}
                  </div>
                </FieldRow>

                <FieldRow title="Zona horaria" description="Usada para referencias visuales y programaciones futuras.">
                  <FieldSelect
                    value={preferences.timezone}
                    onChange={e => updatePreference('timezone', e.target.value)}
                  >
                    <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="UTC">UTC</option>
                  </FieldSelect>
                </FieldRow>

                <FieldRow title="Tema" description="Dark por defecto. Light disponible para lectura extendida.">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'dark',  label: 'Dark',  note: 'Modo oscuro' },
                      { key: 'light', label: 'Light', note: 'Modo claro' },
                    ].map(opt => (
                      <OptionButton
                        key={opt.key}
                        active={preferences.theme === opt.key}
                        onClick={() => updatePreference('theme', opt.key)}
                        label={opt.label}
                        note={opt.note}
                      />
                    ))}
                  </div>
                </FieldRow>

              </div>
            </div>

            {/* Seccion: Notificaciones */}
            <div className="card p-6">
              <SectionLabel>Notificaciones</SectionLabel>
              <div className="space-y-2">
                {[
                  { key: 'dueTasks',     title: 'Tareas por vencer',  note: 'Avisos para compromisos cercanos' },
                  { key: 'weeklySummary', title: 'Resumen semanal',    note: 'Resumen de productividad y negocio' },
                  { key: 'aiSuggestions', title: 'Sugerencias IA',     note: 'Recomendaciones contextuales en el dashboard' },
                ].map(item => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-6 rounded-[8px] px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white">{item.title}</p>
                      <p className="text-[11.5px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>{item.note}</p>
                    </div>
                    <Toggle
                      checked={preferences.notifications[item.key]}
                      onChange={val => updateNotification(item.key, val)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Seccion: Datos */}
            <div className="card p-6">
              <SectionLabel>Gestion de datos</SectionLabel>
              <p className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Acciones destructivas con confirmacion. No se pueden deshacer.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <DangerButton
                  label="Borrar datos contables"
                  note="Elimina ventas, inversion y ranking."
                  tone="warning"
                  disabled={deletingScope === 'accounting'}
                  onClick={() => handleDelete('accounting')}
                />
                <DangerButton
                  label="Borrar tareas"
                  note="Elimina tablero, estados y estadisticas."
                  tone="warning"
                  disabled={deletingScope === 'tasks'}
                  onClick={() => handleDelete('tasks')}
                />
                <DangerButton
                  label="Borrar todo"
                  note="Limpia datos contables y tareas."
                  tone="danger"
                  disabled={deletingScope === 'all'}
                  onClick={() => handleDelete('all')}
                />
              </div>
            </div>

          </div>

          {/* Right: summary panel */}
          <div className="card p-5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.30)' }}>
              Configuracion actual
            </p>
            {[
              { label: 'Moneda visual',     value: preferences.currency },
              { label: 'Tasa ARS/USD',      value: Number(preferences.exchangeRate).toLocaleString('es-AR') },
              { label: 'Formato',           value: preferences.numberFormat === 'compact' ? 'Compacto' : 'Completo' },
              { label: 'Zona horaria',      value: preferences.timezone.split('/').pop().replace('_', ' ') },
              { label: 'Tema',              value: preferences.theme === 'dark' ? 'Dark' : 'Light' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-[8px] px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
                <p className="text-[12.5px] font-semibold text-white truncate">{value}</p>
              </div>
            ))}
            <div
              className="rounded-[8px] px-3 py-3 mt-2"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.16)' }}
            >
              <p className="text-[11px] mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Preview conversion</p>
              <p className="text-[15px] font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(sampleBase)}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
                ARS {sampleBase.toLocaleString('es-AR')}
                {sampleConverted != null && preferences.currency === 'USD' ? ` = USD ${sampleConverted.toFixed(2)}` : ''}
              </p>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}
