import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl font-bold text-white">
            Guillon <span className="text-[#F59E0B]">AP</span>
          </span>
        </div>

        {/* 404 */}
        <div>
          <p className="text-8xl font-black text-[#F59E0B] tabular-nums leading-none">404</p>
          <h1 className="text-xl font-semibold text-white mt-3">Página no encontrada</h1>
          <p className="text-zinc-500 text-sm mt-2">
            La ruta que buscás no existe o fue movida.
          </p>
        </div>

        {/* Acción */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#F59E0B] hover:bg-[#E8A020] text-black font-semibold rounded-xl transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Ir al Dashboard
        </Link>
      </div>
    </div>
  )
}
