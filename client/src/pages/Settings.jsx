import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '../components/Layout'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

// ── Section wrapper ───────────────────────────────────────────────────────────
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

// ── Row layout ────────────────────────────────────────────────────────────────
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

// ── Toggle ────────────────────────────────────────────────────────────────────
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

// ── Number input ──────────────────────────────────────────────────────────────
function NumInput({ value, onChange, prefix, suffix, min, max, step = 1 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 10px', border: '1px solid rgba(255,255,255,0.1)' }}>
      {prefix && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{prefix}</span>}
      <input
        type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, outline: 'none', width: 90, textAlign: 'right' }}
      />
      {suffix && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{suffix}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'guillon_settings'

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export default function Settings() {
  const { showToast } = useToast()
  const { user, logout } = useAuth()

  const saved = loadSettings()

  // Business
  const [currency, setCurrency] = useState(saved.currency ?? 'USD')
  const [exchangeRate, setExchangeRate] = useState(saved.exchangeRate ?? 1)
  const [monthlyGoal, setMonthlyGoal] = useState(saved.monthlyGoal ?? 100000)
  const [roasThreshold, setRoasThreshold] = useState(saved.roasThreshold ?? 1.5)

  // Notifications
  const [alertLowRoas, setAlertLowRoas] = useState(saved.alertLowRoas ?? true)
  const [alertGoalProgress, setAlertGoalProgress] = useState(saved.alertGoalProgress ?? true)
  const [alertDeclining, setAlertDeclining] = useState(saved.alertDeclining ?? true)

  // Appearance
  const [compactMode, setCompactMode] = useState(saved.compactMode ?? false)
  const [dateFormat, setDateFormat] = useState(saved.dateFormat ?? 'YYYY-MM-DD')

  const [changePwForm, setChangePwForm] = useState({ current: '', next: '', confirm: '' })
  const [changingPw, setChangingPw] = useState(false)
  const [pwSection, setPwSection] = useState(false)

  const persist = (patch) => {
    const current = loadSettings()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }))
  }

  // Auto-save on any change
  useEffect(() => {
    persist({ currency, exchangeRate, monthlyGoal, roasThreshold, alertLowRoas, alertGoalProgress, alertDeclining, compactMode, dateFormat })
  }, [currency, exchangeRate, monthlyGoal, roasThreshold, alertLowRoas, alertGoalProgress, alertDeclining, compactMode, dateFormat])

  const handleSaveGoal = () => showToast('Configuracion guardada', 'success')

  const handleChangePw = async () => {
    if (changePwForm.next !== changePwForm.confirm) {
      showToast('Las contrasenas no coinciden', 'error'); return
    }
    if (changePwForm.next.length < 6) {
      showToast('Minimo 6 caracteres', 'error'); return
    }
    setChangingPw(true)
    try {
      await axios.patch('/api/auth/password', {
        current_password: changePwForm.current,
        new_password: changePwForm.next,
      })
      showToast('Contrasena actualizada', 'success')
      setChangePwForm({ current: '', next: '', confirm: '' })
      setPwSection(false)
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al cambiar contrasena', 'error')
    } finally {
      setChangingPw(false)
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  const currencies = [
    { value: 'USD', label: 'USD — Dolar' },
    { value: 'ARS', label: 'ARS — Peso argentino' },
    { value: 'EUR', label: 'EUR — Euro' },
    { value: 'BRL', label: 'BRL — Real' },
    { value: 'MXN', label: 'MXN — Peso mexicano' },
  ]

  const dateFormats = [
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  ]

  return (
    <Layout>
      <div className="page-shell" style={{ maxWidth: 680 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Configuracion</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Preferencias y parametros del negocio
          </p>
        </div>

        {/* Business */}
        <Section title="Negocio" description="Parametros clave para calculos y alertas">
          <Row label="Moneda principal" hint="Afecta como se muestran los valores">
            <Select value={currency} onChange={setCurrency} options={currencies} />
          </Row>
          {currency !== 'USD' && (
            <Row label="Tipo de cambio" hint={`1 USD = X ${currency}`}>
              <NumInput value={exchangeRate} onChange={setExchangeRate} min={0.01} step={0.01} suffix={currency} />
            </Row>
          )}
          <Row label="Meta mensual de revenue" hint="Usada en el tracker de la pantalla Home">
            <NumInput value={monthlyGoal} onChange={setMonthlyGoal} min={0} step={1000} prefix="$" />
          </Row>
          <Row label="Umbral de ROAS bajo" hint="Por debajo de este valor se genera una alerta">
            <NumInput value={roasThreshold} onChange={setRoasThreshold} min={0.1} max={10} step={0.1} suffix="x" />
          </Row>
          <div style={{ marginTop: 16 }}>
            <button onClick={handleSaveGoal} style={{
              background: '#F59E0B', color: '#0E0E14', border: 'none', borderRadius: 8,
              padding: '9px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>Guardar cambios</button>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Alertas" description="Controla que alertas aparecen en el dashboard">
          <Row label="ROAS bajo" hint={`Alerta cuando un producto baja de ${roasThreshold}x`}>
            <Toggle value={alertLowRoas} onChange={setAlertLowRoas} />
          </Row>
          <Row label="Progreso de meta" hint="Aviso cuando estas al 80% del mes sin alcanzar la meta">
            <Toggle value={alertGoalProgress} onChange={setAlertGoalProgress} />
          </Row>
          <Row label="Productos en declive" hint="Alerta cuando un producto pierde mas del 20% de revenue">
            <Toggle value={alertDeclining} onChange={setAlertDeclining} />
          </Row>
        </Section>

        {/* Appearance */}
        <Section title="Apariencia" description="Preferencias visuales de la interfaz">
          <Row label="Modo compacto" hint="Reduce el espaciado y el tamano de textos secundarios">
            <Toggle value={compactMode} onChange={setCompactMode} />
          </Row>
          <Row label="Formato de fecha">
            <Select value={dateFormat} onChange={setDateFormat} options={dateFormats} />
          </Row>
        </Section>

        {/* Account */}
        <Section title="Cuenta" description="Datos de tu usuario">
          <Row label="Email" hint="No se puede cambiar">
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{user?.email || '-'}</span>
          </Row>
          <Row label="Rol">
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{user?.role || 'user'}</span>
          </Row>
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setPwSection(v => !v)} style={{
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer',
            }}>
              {pwSection ? 'Cancelar' : 'Cambiar contrasena'}
            </button>
          </div>

          {pwSection && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['current', 'Contrasena actual'],
                ['next', 'Nueva contrasena'],
                ['confirm', 'Confirmar nueva contrasena'],
              ].map(([k, label]) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, display: 'block' }}>{label}</label>
                  <input
                    type="password"
                    value={changePwForm[k]}
                    onChange={e => setChangePwForm(f => ({ ...f, [k]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}
              <button onClick={handleChangePw} disabled={changingPw} style={{
                background: '#F59E0B', color: '#0E0E14', border: 'none', borderRadius: 8,
                padding: '9px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                opacity: changingPw ? 0.6 : 1, marginTop: 4,
              }}>
                {changingPw ? 'Guardando...' : 'Actualizar contrasena'}
              </button>
            </div>
          )}
        </Section>

        {/* Danger zone */}
        <Section title="Sesion">
          <button onClick={logout} style={{
            background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: 8, padding: '9px 24px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
          }}>Cerrar sesion</button>
        </Section>
      </div>
    </Layout>
  )
}
