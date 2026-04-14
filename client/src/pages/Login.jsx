import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

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
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'radial-gradient(ellipse at 50% -10%, rgba(50,50,93,0.18) 0%, transparent 60%), #07111f',
      }}
    >
      <div className="w-full max-w-[340px]">

        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-10 h-10 mb-4"
            style={{
              background: 'linear-gradient(135deg, #E8A020 0%, #f5c842 100%)',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(232,160,32,0.32)',
            }}
          >
            <span className="text-[#07111f] font-bold text-[16px]">G</span>
          </div>
          <h1
            className="text-white text-[26px] font-light leading-none mb-1.5"
            style={{ letterSpacing: '-0.04em' }}
          >
            Guillon <span style={{ color: '#E8A020', fontWeight: 400 }}>AP</span>
          </h1>
          <p className="text-[#3d5068] text-[12px] tracking-[0.12em] uppercase">
            Sales Intelligence Platform
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'rgba(11, 18, 34, 0.96)',
            border: '1px solid rgba(148,163,184,0.10)',
            borderRadius: '8px',
            boxShadow: 'rgba(50,50,93,0.22) 0px 20px 40px -16px, rgba(0,0,0,0.22) 0px 10px 20px -8px, rgba(255,255,255,0.02) 0px 1px 0px inset',
            padding: '28px',
          }}
        >
          <p className="text-[#94a3b8] text-[13px] font-medium mb-6">
            Iniciá sesión en tu cuenta
          </p>

          {error && (
            <div
              className="text-[#fb7185] text-[13px] px-3 py-2.5 mb-5 flex items-center gap-2"
              style={{
                background: 'rgba(251,113,133,0.08)',
                border: '1px solid rgba(251,113,133,0.18)',
                borderRadius: '6px',
              }}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[#64748b] text-[12px] font-medium block">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="tu@email.com"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(148,163,184,0.14)',
                  borderRadius: '6px',
                  color: '#f1f5f9',
                  padding: '9px 12px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(232,160,32,0.50)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(232,160,32,0.10)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(148,163,184,0.14)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#64748b] text-[12px] font-medium block">Contraseña</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(148,163,184,0.14)',
                  borderRadius: '6px',
                  color: '#f1f5f9',
                  padding: '9px 12px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(232,160,32,0.50)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(232,160,32,0.10)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(148,163,184,0.14)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-medium text-[14px] transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: '#E8A020',
                color: '#07111f',
                borderRadius: '6px',
                padding: '9px 16px',
                boxShadow: '0 4px 14px rgba(232,160,32,0.22)',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = '#f5b33a' }}
              onMouseLeave={e => { e.target.style.background = '#E8A020' }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#3d5068] text-[13px] mt-5">
          ¿No tenés cuenta?{' '}
          <Link
            to="/register"
            className="font-medium transition-colors"
            style={{ color: '#E8A020' }}
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
