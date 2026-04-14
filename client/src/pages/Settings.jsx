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
      className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-[#E8A020]' : 'bg-white/[0.1]'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function FieldCard({ title, description, children }) {
  return (
    <div className="card p-5">
      <p className="text-white font-semibold text-sm">{title}</p>
      <p className="text-[#9eb0cb] text-xs mt-1 mb-4">{description}</p>
      {children}
    </div>
  )
}

function DangerButton({ label, note, tone, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-[6px] border px-4 py-3.5 text-left transition-all disabled:opacity-60 ${
        tone === 'danger'
          ? 'border-[#fb7185]/18 bg-[#fb7185]/[0.07] text-white hover:bg-[#fb7185]/[0.11]'
          : 'border-[#E8A020]/18 bg-[#E8A020]/[0.07] text-white hover:bg-[#E8A020]/[0.11]'
      }`}
    >
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs text-[#d5deed] mt-1">{note}</p>
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

    const confirmed = window.confirm(`Esta accion no se puede deshacer.\n\nConfirmar ${labels[scope]}.`)
    if (!confirmed) return

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
      <div className="space-y-5 max-w-[1280px] mx-auto w-full">
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_320px] gap-5">
          <div className="card-elevated p-6">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#3d5068] font-medium">Configuración</p>
            <h1 className="text-[26px] font-light text-white mt-2 leading-none" style={{ letterSpacing: '-0.04em' }}>
              Preferencias <span style={{ color: '#E8A020', fontWeight: 400 }}>operativas</span>
            </h1>
            <p className="text-[#64748b] text-[13px] mt-3 max-w-2xl leading-relaxed">
              Ajustá moneda, tasa de cambio, formato, zona horaria, tema y limpieza de datos.
            </p>
          </div>

          <div className="card p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#7d8ca5]">Resumen actual</p>
            <div className="space-y-3 mt-4">
              <div className="rounded-[6px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[#7d8ca5] text-xs">Moneda visual</p>
                <p className="text-white font-semibold mt-1">{preferences.currency}</p>
              </div>
              <div className="rounded-[6px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[#7d8ca5] text-xs">Tasa ARS/USD</p>
                <p className="text-white font-semibold mt-1">{Number(preferences.exchangeRate).toLocaleString('es-AR')}</p>
              </div>
              <div className="rounded-[6px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[#7d8ca5] text-xs">Preview conversion</p>
                <p className="text-white font-semibold mt-1">{formatCurrency(sampleBase)}</p>
                <p className="text-[#8ea0bc] text-xs mt-1">
                  Base guardada: ARS {sampleBase.toLocaleString('es-AR')} {sampleConverted != null && preferences.currency === 'USD' ? `= USD ${sampleConverted.toFixed(2)}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <FieldCard title="Moneda" description="La app convierte los montos guardados en ARS a la moneda visual elegida.">
            <div className="grid grid-cols-2 gap-3">
              {['USD', 'ARS'].map(currency => (
                <button
                  key={currency}
                  onClick={() => updatePreference('currency', currency)}
                  className={`rounded-[6px] border px-4 py-4 text-left transition-all ${preferences.currency === currency ? 'border-[#E8A020]/40 bg-[#E8A020]/10 text-white' : 'border-white/10 bg-white/[0.03] text-[#c0cee4]'}`}
                >
                  <p className="font-semibold">{currency}</p>
                  <p className="text-xs text-[#8ea0bc] mt-1">{currency === 'USD' ? 'Dolar estadounidense' : 'Peso argentino'}</p>
                </button>
              ))}
            </div>
          </FieldCard>

          <FieldCard title="Tasa de cambio" description="Usada para convertir automaticamente montos entre ARS y USD en dashboard, graficos y rankings.">
            <label className="block">
              <span className="text-[#8ea0bc] text-xs">ARS por 1 USD</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={preferences.exchangeRate}
                onChange={event => updatePreference('exchangeRate', Number(event.target.value) || 1)}
                className="mt-2 w-full rounded-[6px] bg-white/[0.04] border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-[#E8A020]/30"
              />
            </label>
            <p className="text-[#8ea0bc] text-xs mt-3">Ejemplo: ARS 250.000 se muestran como {formatCurrency(sampleBase)} con la configuracion actual.</p>
          </FieldCard>

          <FieldCard title="Formato de numeros" description="Controla si los valores se muestran compactos o completos.">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'compact', label: 'Compacto', note: '1.2K, 2.5M' },
                { key: 'standard', label: 'Completo', note: '1,250 o 2,500,000' },
              ].map(option => (
                <button
                  key={option.key}
                  onClick={() => updatePreference('numberFormat', option.key)}
                  className={`rounded-[6px] border px-4 py-4 text-left transition-all ${preferences.numberFormat === option.key ? 'border-[#E8A020]/40 bg-[#E8A020]/10 text-white' : 'border-white/10 bg-white/[0.03] text-[#c0cee4]'}`}
                >
                  <p className="font-semibold">{option.label}</p>
                  <p className="text-xs text-[#8ea0bc] mt-1">{option.note}</p>
                </button>
              ))}
            </div>
          </FieldCard>

          <FieldCard title="Zona horaria" description="Usada para referencias visuales y programaciones futuras.">
            <select
              value={preferences.timezone}
              onChange={event => updatePreference('timezone', event.target.value)}
              className="w-full rounded-[6px] bg-white/[0.04] border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-[#E8A020]/30"
            >
              <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires</option>
              <option value="America/New_York">America/New_York</option>
              <option value="UTC">UTC</option>
            </select>
          </FieldCard>

          <FieldCard title="Tema" description="Mantiene dark mode por defecto, pero puedes alternar a light para lectura extendida.">
            <div className="grid grid-cols-2 gap-3">
              {['dark', 'light'].map(theme => (
                <button
                  key={theme}
                  onClick={() => updatePreference('theme', theme)}
                  className={`rounded-[6px] border px-4 py-4 text-left transition-all capitalize ${preferences.theme === theme ? 'border-[#E8A020]/40 bg-[#E8A020]/10 text-white' : 'border-white/10 bg-white/[0.03] text-[#c0cee4]'}`}
                >
                  <p className="font-semibold">{theme}</p>
                  <p className="text-xs text-[#8ea0bc] mt-1">{theme === 'dark' ? 'Modo oscuro profesional' : 'Modo claro para lectura'}</p>
                </button>
              ))}
            </div>
          </FieldCard>
        </div>

        <FieldCard title="Notificaciones" description="Preferencias visuales de avisos y resumenes operativos.">
          <div className="space-y-4">
            {[
              { key: 'dueTasks', title: 'Tareas por vencer', note: 'Avisos para compromisos cercanos' },
              { key: 'weeklySummary', title: 'Resumen semanal', note: 'Resumen de productividad y negocio' },
              { key: 'aiSuggestions', title: 'Sugerencias IA', note: 'Recomendaciones contextuales dentro del dashboard' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between gap-4 rounded-[6px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div>
                  <p className="text-white font-medium text-sm">{item.title}</p>
                  <p className="text-[#8ea0bc] text-xs mt-1">{item.note}</p>
                </div>
                <Toggle checked={preferences.notifications[item.key]} onChange={value => updateNotification(item.key, value)} />
              </div>
            ))}
          </div>
        </FieldCard>

        <FieldCard title="Datos" description="Acciones de limpieza con confirmacion. Esta accion no se puede deshacer.">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <DangerButton
              label="Borrar datos contables"
              note="Elimina ventas, inversion y ranking de productos."
              tone="warning"
              disabled={deletingScope === 'accounting'}
              onClick={() => handleDelete('accounting')}
            />
            <DangerButton
              label="Borrar tareas"
              note="Elimina tablero, estados y estadisticas de tareas."
              tone="warning"
              disabled={deletingScope === 'tasks'}
              onClick={() => handleDelete('tasks')}
            />
            <DangerButton
              label="Borrar todo"
              note="Limpia datos contables y tareas del usuario."
              tone="danger"
              disabled={deletingScope === 'all'}
              onClick={() => handleDelete('all')}
            />
          </div>
        </FieldCard>
      </div>
    </Layout>
  )
}
