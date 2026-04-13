import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { DateRangeProvider } from './context/DateRangeContext'
import { PreferencesProvider } from './context/PreferencesContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import AIChat from './components/AIChat'
import Login from './pages/Login'
import Register from './pages/Register'
import Pending from './pages/Pending'
import Dashboard from './pages/Dashboard'
import DataEntry from './pages/DataEntry'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Admin from './pages/Admin'
import Tasks from './pages/Tasks'
import TaskDashboard from './pages/TaskDashboard'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{ display: 'contents' }}
      >
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pending" element={<Pending />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/cargar" element={<ProtectedRoute><DataEntry /></ProtectedRoute>} />
          <Route path="/productos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/productos/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
          <Route path="/tareas" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/tareas/dashboard" element={<ProtectedRoute><TaskDashboard /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
          <Route path="/configuracion" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <ToastProvider>
          <DateRangeProvider>
            <BrowserRouter>
              <AnimatedRoutes />
              <AIChat />
            </BrowserRouter>
          </DateRangeProvider>
        </ToastProvider>
      </PreferencesProvider>
    </AuthProvider>
  )
}
