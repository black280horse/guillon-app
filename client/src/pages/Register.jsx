import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '10px',
  color: '#F4F4F6',
  padding: '9px 12px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
}

function Field({ label, optional, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[#64748b] text-[12px] font-medium block">
        {label}{optional && <span className="text-[#3d5068] font-normal ml-1">(opcional)</span>}
      </label>
      {children}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', business_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  function handleFocus(e) {
    e.target.style.borderColor = 'rgba(245,158,11,0.50)'
    e.target.style.boxShadow   = '0 0 0 3px rgba(245,158,11,0.10)'
  }
  function handleBlur(e) {
    e.target.style.borderColor = 'rgba(255,255,255,0.10)'
    e.target.style.boxShadow   = 'none'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await axios.post('/api/auth/register', form)
      navigate('/pending')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: 'radial-gradient(ellipse at 50% -10%, rgba(50,50,93,0.18) 0%, transparent 60%), #08080C',
      }}
    >
      <div className="w-full max-w-[340px]">

        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-10 h-10 mb-4"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #f5c842 100%)',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(245,158,11,0.32)',
            }}
          >
            <span className="text-[#07111f] font-bold text-[16px]">G</span>
          </div>
          <h1
            className="text-white text-[26px] font-light leading-none mb-1.5"
            style={{ letterSpacing: '-0.04em' }}
          >
            Guillon <span style={{ color: '#F59E0B', fontWeight: 400 }}>AP</span>
          </h1>
          <p className="text-[#3d5068] text-[12px] tracking-[0.12em] uppercase">
            Sales Intelligence Platform
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'rgba(18,18,26,0.92)',
            border: '1px solid rgba(148,163,184,0.10)',
            borderRadius: '12px',
            boxShadow: ''0 24px 64px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.04) inset',
            padding: '28px',
          }}
        >
          <p className="text-[#94a3b8] text-[13px] font-medium mb-6">
            Creá tu cuenta gratuita
          </p>

          {error && (
            <div
              className="text-[#fb7185] text-[13px] px-3 py-2.5 mb-5 flex items-center gap-2"
              style={{
                background: 'rgba(251,113,133,0.08)',
                border: '1px solid rgba(251,113,133,0.18)',
                borderRadius: '10px',
              }}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nombre completo">
              <input
                type="text" required
                value={form.name} onChange={update('name')}
                placeholder="Juan García"
                style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>

            <Field label="Email">
              <input
                type="email" required
                value={form.email} onChange={update('email')}
                placeholder="tu@email.com"
                style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>

            <Field label="Contraseña">
              <input
                type="password" required minLength={6}
                value={form.password} onChange={update('password')}
                placeholder="Mínimo 6 caracteres"
                style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>

            <Field label="Nombre del negocio" optional>
              <input
                type="text"
                value={form.business_name} onChange={update('business_name')}
                placeholder="Mi Empresa S.A."
                style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-medium text-[14px] transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: '#F59E0B',
                color: '#07111f',
                borderRadius: '10px',
                padding: '9px 16px',
                boxShadow: '0 4px 14px rgba(245,158,11,0.22)',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#FCD34D' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F59E0B' }}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#3d5068] text-[13px] mt-5">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-medium" style={{ color: '#F59E0B' }}>
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
