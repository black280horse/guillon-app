import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Pending() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0E] px-4">
      <div className="w-full max-w-md text-center space-y-6">

        {/* Ícono */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">Cuenta pendiente de aprobación</h1>
          <p className="text-zinc-400 mt-3 leading-relaxed">
            Tu solicitud fue recibida correctamente. El administrador revisará tu cuenta
            y recibirás un email cuando sea aprobada.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left space-y-2">
          <p className="text-zinc-400 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block" />
            Revisión en proceso
          </p>
          <p className="text-zinc-600 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-700 inline-block" />
            Aprobación del administrador
          </p>
          <p className="text-zinc-600 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-700 inline-block" />
            Acceso a la plataforma
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  )
}
