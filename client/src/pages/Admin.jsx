import { useState, useEffect } from 'react'

import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Layout from '../components/Layout'

const STATUS_COLORS = {
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  active:    'bg-green-500/10 text-green-400 border-green-500/30',
  rejected:  'bg-red-500/10 text-red-400 border-red-500/30',
  suspended: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  active: 'Activo',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
}

export default function Admin() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [filter, setFilter] = useState('all')

  async function fetchUsers() {
    try {
      const res = await axios.get('/api/admin/users')
      setUsers(res.data)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  async function doAction(userId, action) {
    setActionLoading(`${userId}-${action}`)
    try {
      await axios.patch(`/api/admin/users/${userId}/${action}`)
      await fetchUsers()
      const labels = { approve: 'aprobado', reject: 'rechazado', suspend: 'suspendido' }
      addToast(`Usuario ${labels[action] || 'actualizado'}`, 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al realizar la acción', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = filter === 'all' ? users : users.filter(u => u.status === filter)

  const counts = {
    all: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white">Panel de Administración</h2>
            <p className="text-zinc-500 text-sm mt-0.5">Gestión de usuarios de la plataforma</p>
          </div>
          <span className="text-xs bg-[#E8A020]/10 text-[#E8A020] border border-[#E8A020]/30 px-2 py-0.5 rounded-full font-medium">
            Admin
          </span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'all', label: 'Total', color: 'text-white' },
            { key: 'pending', label: 'Pendientes', color: 'text-yellow-400' },
            { key: 'active', label: 'Activos', color: 'text-green-400' },
            { key: 'suspended', label: 'Suspendidos', color: 'text-zinc-400' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`bg-zinc-900 border rounded-xl p-4 text-left transition-colors ${
                filter === s.key ? 'border-[#E8A020]' : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <p className={`text-2xl font-bold ${s.color}`}>{counts[s.key]}</p>
              <p className="text-zinc-500 text-xs mt-1">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h3 className="font-medium text-white">
              Usuarios {filter !== 'all' && `— ${STATUS_LABELS[filter]}`}
            </h3>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-zinc-600 py-16">No hay usuarios en esta categoría</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="px-6 py-3 text-left font-medium">Usuario</th>
                    <th className="px-6 py-3 text-left font-medium">Negocio</th>
                    <th className="px-6 py-3 text-left font-medium">Plan</th>
                    <th className="px-6 py-3 text-left font-medium">Estado</th>
                    <th className="px-6 py-3 text-left font-medium">Registro</th>
                    <th className="px-6 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filtered.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{u.name}</p>
                        <p className="text-zinc-500 text-xs">{u.email}</p>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">{u.business_name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          u.plan === 'pro'
                            ? 'bg-[#E8A020]/10 text-[#E8A020] border-[#E8A020]/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                          {u.plan === 'pro' ? 'Pro' : 'Free'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[u.status]}`}>
                          {STATUS_LABELS[u.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-xs">
                        {new Date(u.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-6 py-4">
                        {u.role !== 'admin' && (
                          <div className="flex items-center justify-end gap-2">
                            {u.status !== 'active' && (
                              <ActionButton
                                label="Aprobar"
                                color="green"
                                loading={actionLoading === `${u.id}-approve`}
                                onClick={() => doAction(u.id, 'approve')}
                              />
                            )}
                            {u.status !== 'rejected' && (
                              <ActionButton
                                label="Rechazar"
                                color="red"
                                loading={actionLoading === `${u.id}-reject`}
                                onClick={() => doAction(u.id, 'reject')}
                              />
                            )}
                            {u.status !== 'suspended' && (
                              <ActionButton
                                label="Suspender"
                                color="zinc"
                                loading={actionLoading === `${u.id}-suspend`}
                                onClick={() => doAction(u.id, 'suspend')}
                              />
                            )}
                          </div>
                        )}
                        {u.role === 'admin' && (
                          <span className="text-zinc-600 text-xs text-right block">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

function ActionButton({ label, color, loading, onClick }) {
  const colors = {
    green: 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30',
    red:   'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30',
    zinc:  'bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-40 ${colors[color]}`}
    >
      {loading ? '...' : label}
    </button>
  )
}
