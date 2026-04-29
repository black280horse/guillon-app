import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '../components/Layout'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const SETTINGS_KEY = 'guillon_settings'
const GOALS_KEY    = 'guillon_monthly_goals'
const API_KEY_KEY  = 'guillon_api_keys'

function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}
function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ── UI primitives ─────────────────────────────────────────────────────────────
function Section({ title, description, children }) {
  return (
    <div className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{title}</div>
        {description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{description}</div>}
      </div>
      {children}
    </div>
  )
}

function Row({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 24 }}>{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
      background: value ? '#F59E0B' : 'rgba(255,255,255,0.12)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  )
}

function NumInput({ value, onChange, prefix, suffix, min, max, step = 1 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 10px', border: '1px solid rgba(255,255,255,0.1)' }}>
      {prefix && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{prefix}</span>}
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, outline: 'none', width: 90, textAlign: 'right' }}
      />
      {suffix && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{suffix}</span>}
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer',
    }}>
      {options.map(o => <option key={o.value} value={o.value} style={{ background: '#1a1a2e' }}>{o.label}</option>)}
    </select>
  )
}

// ── Generate month options (current ± 12) ─────────────────────────────────────
function getMonthOptions() {
  const opts = []
  const now = new Date()
  for (let i = -3; i <= 9; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    opts.push({ value: key, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return opts
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { showToast } = useToast()
  const { user, logout } = useAuth()

  const saved = loadJSON(SETTINGS_KEY)
  const savedGoals = loadJSON(GOALS_KEY)
  const savedKeys = loadJSON(API_KEY_KEY)

  // Business settings
  const [currency, setCurrency]         = useState(saved.currency ?? 'USD')
  const [exchangeRate, setExchangeRate] = useState(saved.exchangeRate ?? 1)
  const [roasThreshold, setRoasThreshold] = useState(saved.roasThreshold ?? 1.5)

  // Per-month goals
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthOptions = getMonthOptions()
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey)
  const [monthGoals, setMonthGoals]       = useState(savedGoals)
  const currentGoalValue = monthGoals[selectedMonth] ?? saved.monthlyGoal ?? 100000

  // Notifications
  const [alertLowRoas,     setAlertLowRoas]     = useState(saved.alertLowRoas ?? true)
  const [alertGoalProgress,setAlertGoalProgress]= useState(saved.alertGoalProgress ?? true)
  const [alertDeclining,   setAlertDeclining]   = useState(saved.alertDeclining ?? true)

  // Appearance
  const [dateFormat, setDateFormat] = useState(saved.dateFormat ?? 'YYYY-MM-DD')

  // API Keys
  const [apiKeys, setApiKeys] = useState(savedKeys)
  const [showKey, setShowKey] = useState({})

  // Password change
  const [changePwForm, setChangePwForm] = useState({ current: '', next: '', confirm: '' })
  const [changingPw, setChangingPw]     = useState(false)
  const [pwSection, setPwSection]       = useState(false)

  // Auto-save settings on change
  useEffect(() => {
    saveJSON(SETTINGS_KEY, { currency, exchangeRate, roasThreshold, alertLowRoas, alertGoalProgress, alertDeclining, dateFormat })
  }, [currency, exchangeRate, roasThreshold, alertLowRoas, alertGoalProgress, alertDeclining, dateFormat])

  const handleSaveGoal = () => {
    const updated = { ...monthGoals, [selectedMonth]: currentGoalValue }
    setMonthGoals(updated)
    saveJSON(GOALS_KEY, updated)
    showToast('Meta guardada', 'success')
  }

  const handleGoalChange = val => {
    setMonthGoals(g => ({ ...g, [selectedMonth]: val }))
  }

  const handleSaveApiKey = (provider, key) => {
    const updated = { ...apiKeys, [provider]: key }
    setApiKeys(updated)
    saveJSON(API_KEY_KEY, updated)
    showToast('API key guardada', 'success')
  }

  const handleChangePw = async () => {
    if (changePwForm.next !== changePwForm.confirm) { showToast('Las contraseñas no coinciden', 'error'); return }
    if (changePwForm.next.length < 6) { showToast('Mínimo 6 caracteres', 'error'); return }
    setChangingPw(true)
    try {
      await axios.patch('/api/auth/password', { current_password: changePwForm.current, new_password: changePwForm.next })
      showToast('Contraseña actualizada', 'success')
      setChangePwForm({ current: '', next: '', confirm: '' })
      setPwSection(false)
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al cambiar contraseña', 'error')
    } finally {
      setChangingPw(false)
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  const API_PROVIDERS = [
    { key: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
    { key: 'openai',    label: 'OpenAI (ChatGPT)',   placeholder: 'sk-...' },
    { key: 'gemini',    label: 'Google (Gemini)',     placeholder: 'AIza...' },
    { key: 'deepseek',  label: 'DeepSeek',            placeholder: 'ds-...' },
  ]

  return (
    <Layout>
      <div className="page-shell" style={{ maxWidth: 700 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Configuración</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Preferencias y parámetros del negocio</p>
        </div>

        {/* ── Meta mensual por mes ─────────────────────────────────── */}
        <Section title="Meta mensual" description="Define un objetivo de facturación independiente para cada mes">
          <Row label="Mes" hint="Selecciona el mes a configurar">
            <Select value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} />
          </Row>
          <Row label={`Meta de facturación — ${monthOptions.find(m => m.value === selectedMonth)?.label}`}
               hint="Este valor se usa en Home y Dashboard para el seguimiento">
            <NumInput value={currentGoalValue} onChange={handleGoalChange} min={0} step={1000} prefix="$" />
          </Row>
          {/* Quick preview of all set goals */}
          {Object.keys(monthGoals).length > 0 && (
            <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>Metas configuradas</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(monthGoals).sort().map(([k, v]) => (
                  <div key={k} style={{ padding: '4px 10px', background: k === selectedMonth ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{k}: </span>
                    <span style={{ color: k === selectedMonth ? '#F59E0B' : '#fff', fontWeight: 600 }}>${Number(v).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <button onClick={handleSaveGoal} style={{
              background: '#F59E0B', color: '#0E0E14', border: 'none', borderRadius: 8,
              padding: '9px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>Guardar meta</button>
          </div>
        </Section>

        {/* ── Negocio ──────────────────────────────────────────────── */}
        <Section title="Negocio" description="Parámetros generales del negocio">
          <Row label="Moneda principal">
            <Select value={currency} onChange={setCurrency} options={[
              { value: 'USD', label: 'USD — Dólar' },
              { value: 'ARS', label: 'ARS — Peso argentino' },
              { value: 'EUR', label: 'EUR — Euro' },
              { value: 'BRL', label: 'BRL — Real' },
              { value: 'MXN', label: 'MXN — Peso mexicano' },
            ]} />
          </Row>
          {currency !== 'USD' && (
            <Row label="Tipo de cambio" hint={`1 USD = X ${currency}`}>
              <NumInput value={exchangeRate} onChange={setExchangeRate} min={0.01} step={0.01} suffix={currency} />
            </Row>
          )}
          <Row label="Umbral de ROAS bajo" hint="Por debajo de este valor se genera alerta">
            <NumInput value={roasThreshold} onChange={setRoasThreshold} min={0.1} max={10} step={0.1} suffix="x" />
          </Row>
        </Section>

        {/* ── Alertas ───────────────────────────────────────────────── */}
        <Section title="Alertas" description="Controla qué alertas aparecen en el dashboard">
          <Row label="ROAS bajo" hint={`Alerta cuando un producto baja de ${roasThreshold}x`}>
            <Toggle value={alertLowRoas} onChange={setAlertLowRoas} />
          </Row>
          <Row label="Progreso de meta" hint="Aviso cuando estás al 80% del mes sin alcanzar la meta">
            <Toggle value={alertGoalProgress} onChange={setAlertGoalProgress} />
          </Row>
          <Row label="Productos en declive" hint="Alerta cuando un producto pierde más del 20% de facturación">
            <Toggle value={alertDeclining} onChange={setAlertDeclining} />
          </Row>
        </Section>

        {/* ── API Keys ──────────────────────────────────────────────── */}
        <Section title="API Keys" description="Conecta tu propia clave de IA para análisis automático">
          {API_PROVIDERS.map(p => (
            <div key={p.key} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{p.label}</div>
                  {apiKeys[p.key] && (
                    <div style={{ fontSize: 11, color: '#34D399', marginTop: 2 }}>✓ Configurada</div>
                  )}
                </div>
                {apiKeys[p.key] && (
                  <button onClick={() => { const u = { ...apiKeys }; delete u[p.key]; setApiKeys(u); saveJSON(API_KEY_KEY, u); showToast('API key eliminada', 'success') }}
                    style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: 12 }}>
                    Eliminar
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type={showKey[p.key] ? 'text' : 'password'}
                  value={apiKeys[p.key] || ''}
                  onChange={e => setApiKeys(k => ({ ...k, [p.key]: e.target.value }))}
                  placeholder={p.placeholder}
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12, flex: 1 }}
                />
                <button onClick={() => setShowKey(s => ({ ...s, [p.key]: !s[p.key] }))}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0 12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {showKey[p.key] ? 'Ocultar' : 'Ver'}
                </button>
                <button onClick={() => handleSaveApiKey(p.key, apiKeys[p.key] || '')}
                  style={{ background: '#F59E0B', color: '#0E0E14', border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                  Guardar
                </button>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
            Las claves se guardan localmente en tu navegador y no se envían al servidor.
          </div>
        </Section>

        {/* ── Apariencia ────────────────────────────────────────────── */}
        <Section title="Apariencia">
          <Row label="Formato de fecha">
            <Select value={dateFormat} onChange={setDateFormat} options={[
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
            ]} />
          </Row>
        </Section>

        {/* ── Cuenta ───────────────────────────────────────────────── */}
        <Section title="Cuenta">
          <Row label="Email"><span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{user?.email || '-'}</span></Row>
          <Row label="Rol"><span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{user?.role || 'user'}</span></Row>
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setPwSection(v => !v)} style={{
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, cursor: 'pointer',
            }}>{pwSection ? 'Cancelar' : 'Cambiar contraseña'}</button>
          </div>
          {pwSection && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['current','Contraseña actual'],['next','Nueva contraseña'],['confirm','Confirmar nueva contraseña']].map(([k, label]) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, display: 'block' }}>{label}</label>
                  <input type="password" value={changePwForm[k]}
                    onChange={e => setChangePwForm(f => ({ ...f, [k]: e.target.value }))}
                    style={inputStyle} />
                </div>
              ))}
              <button onClick={handleChangePw} disabled={changingPw} style={{
                background: '#F59E0B', color: '#0E0E14', border: 'none', borderRadius: 8,
                padding: '9px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                opacity: changingPw ? 0.6 : 1, marginTop: 4,
              }}>{changingPw ? 'Guardando...' : 'Actualizar contraseña'}</button>
            </div>
          )}
        </Section>

        {/* ── Sesión ───────────────────────────────────────────────── */}
        <Section title="Sesión">
          <button onClick={logout} style={{
            background: 'rgba(248,113,113,0.1)', color: '#F87171',
            border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8,
            padding: '9px 24px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
          }}>Cerrar sesión</button>
        </Section>
      </div>
    </Layout>
  )
}
