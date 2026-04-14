import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '10px',
  color: '#F4F4F6',
  padding: '11px 14px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
}

export default function Login() {
  const { setToken } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/login', form)
      setToken(res.data.token, res.data.user)
      navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      const code = err.response?.data?.code
      const msg  = err.response?.data?.error || 'Error al iniciar sesión'
      if (code === 'PENDING') return navigate('/pending')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: '#08080C',
        backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(129,140,248,0.12) 0%, transparent 60%)',
      }}
    >
      <div className="w-full max-w-[360px]">

        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 mb-5"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
              borderRadius: '14px',
              boxShadow: '0 0 32px rgba(245,158,11,0.35), 0 8px 24px rgba(0,0,0,0.40)',
            }}
          >
            <span className="text-[#1A0A00] font-bold text-[20px]" style={{ letterSpacing: '-0.04em' }}>G</span>
          </div>
          <h1 className="text-white text-[28px] font-bold leading-none mb-2" style={{ letterSpacing: '-0.04em' }}>
            Guillon AP
          </h1>
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase" style={{ color: 'rgba(255,255,255,0.28)' }}>
            Business Intelligence
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'rgba(18,18,26,0.90)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '20px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.04) inset',
            padding: '32px',
          }}
        >
          <p className="text-[15px] font-semibold text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
            Iniciá sesión
          </p>
          <p className="text-[13px] mb-6" style={{ color: 'rgba(255,255,255,0.38)' }}>
            Accedé a tu panel de Business OS
          </p>

          {error && (
            <div
              className="text-[13px] px-4 py-3 mb-5 flex items-center gap-2"
              style={{
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.20)',
                borderRadius: '10px',
                color: '#F87171',
              }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 001.71 3h16.94a2 2 001.71-3L13.71 3.86a2 2 00-3.42 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11.5px] font-semibold uppercase tracking-[0.12em] mb-2"
                style={{ color: 'rgba(255,255,255,0.35)' }}>
                Email
              </label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="tu@email.com"
                style={inputStyle}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(245,158,11,0.50)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.10)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.10)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold uppercase tracking-[0.12em] mb-2"
                style={{ color: 'rgba(255,255,255,0.35)' }}>
                Contraseña
              </label>
              <input
                type="password" required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(245,158,11,0.50)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.10)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.10)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold text-[14px] transition-all mt-2 disabled:opacity-50"
              style={{
                background: '#F59E0B',
                color: '#1A0A00',
                borderRadius: '10px',
                padding: '12px 16px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 24px rgba(245,158,11,0.25), 0 4px 12px rgba(0,0,0,0.30)',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#FCD34D'; e.currentTarget.style.boxShadow = '0 0 32px rgba(245,158,11,0.35), 0 4px 12px rgba(0,0,0,0.30)' } }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F59E0B'; e.currentTarget.style.boxShadow = '0 0 24px rgba(245,158,11,0.25), 0 4px 12px rgba(0,0,0,0.30)' }}
            >
              {loading ? 'Ingresando…' : 'Ingresar →'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] mt-5" style={{ color: 'rgba(255,255,255,0.30)' }}>
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="font-semibold" style={{ color: '#F59E0B' }}>
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
