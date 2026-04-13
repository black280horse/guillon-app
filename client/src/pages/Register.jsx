import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', business_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
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
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] px-4 py-10">
      {/* Glow de fondo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#E8A020]/5 blur-[100px]" />
      </div>

      <div className="w-full max-w-[360px] relative">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#E8A020] shadow-[0_0_24px_rgba(232,160,32,0.4)] mb-5">
            <span className="font-display text-black font-black text-xl">G</span>
          </div>
          <h1 className="font-display text-[28px] font-bold text-[#fafafa] tracking-tight leading-none">
            Guillon <span className="text-[#E8A020]">AP</span>
          </h1>
          <p className="text-[#52525b] text-[13px] mt-2 tracking-wide">Sales Intelligence Platform</p>
        </div>

        {/* Card */}
        <div className="bg-[#111113] border border-[#1e1e22] rounded-2xl p-7 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
          <h2 className="font-display text-[#fafafa] text-[17px] font-semibold mb-6">Crear cuenta</h2>

          {error && (
            <div className="bg-[#ef4444]/8 border border-[#ef4444]/20 text-[#ef4444] text-[13px] px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
              <span className="shrink-0">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[#71717a] text-[13px] font-medium">Nombre completo</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={update('name')}
                className="w-full bg-[#18181b] border border-[#27272a] text-[#fafafa] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#E8A020]/60 focus:bg-[#1c1c21] placeholder:text-[#3f3f46] transition-all"
                placeholder="Juan García"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#71717a] text-[13px] font-medium">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={update('email')}
                className="w-full bg-[#18181b] border border-[#27272a] text-[#fafafa] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#E8A020]/60 focus:bg-[#1c1c21] placeholder:text-[#3f3f46] transition-all"
                placeholder="tu@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#71717a] text-[13px] font-medium">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={update('password')}
                className="w-full bg-[#18181b] border border-[#27272a] text-[#fafafa] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#E8A020]/60 focus:bg-[#1c1c21] placeholder:text-[#3f3f46] transition-all"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#71717a] text-[13px] font-medium">
                Nombre del negocio{' '}
                <span className="text-[#3f3f46] font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={form.business_name}
                onChange={update('business_name')}
                className="w-full bg-[#18181b] border border-[#27272a] text-[#fafafa] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#E8A020]/60 focus:bg-[#1c1c21] placeholder:text-[#3f3f46] transition-all"
                placeholder="Mi Empresa S.A."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8A020] hover:bg-[#F5AC28] active:bg-[#d4911c] text-black font-semibold py-3 rounded-xl text-[14px] transition-all shadow-[0_4px_16px_rgba(232,160,32,0.25)] hover:shadow-[0_4px_20px_rgba(232,160,32,0.35)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#52525b] text-[13px] mt-5">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-[#E8A020] hover:text-[#F5AC28] font-medium transition-colors">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
