import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Feed from './pages/Feed'
import Submit from './pages/Submit'
import Admin from './pages/Admin'
import AdminLogin from './pages/AdminLogin'
import Login from './pages/Login'
import Register from './pages/Register'
import MyStories from './pages/MyStories'

function ProtectedRoute({ children, isAuth }) {
  return isAuth ? children : <Navigate to="/login" />
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!sessionStorage.getItem('token'))
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(!!sessionStorage.getItem('admin_token'))
  const [authNotice, setAuthNotice] = useState(() => sessionStorage.getItem('auth_notice') || '')

  useEffect(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('admin_token')
    localStorage.removeItem('username')
  }, [])

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!sessionStorage.getItem('token'))
      setIsAdminAuthenticated(!!sessionStorage.getItem('admin_token'))
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    if (authNotice) sessionStorage.removeItem('auth_notice')
  }, [authNotice])

  useEffect(() => {
    const registerPresence = async () => {
      const token = sessionStorage.getItem('token') || sessionStorage.getItem('admin_token')
      try {
        await axios.post('/api/stats/visit', {}, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
      } catch (_ignored) {
        // Falhas de telemetria nao bloqueiam navegacao.
      }
    }

    registerPresence()
    const intervalId = window.setInterval(registerPresence, 5 * 60 * 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <Router>
      {authNotice && (
        <div role="alert" className="fixed inset-x-0 top-0 z-[60] bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-900 shadow-md">
          {authNotice}
          <button type="button" onClick={() => setAuthNotice('')} className="ml-3 font-bold underline">Fechar</button>
        </div>
      )}
      <nav className="site-nav sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center gap-6">
          <h1 className="site-brand text-xl font-bold">
            <a href="/">Casos, Causos e Outras Histórias</a>
          </h1>
          <div className="site-menu flex gap-2 items-center">
            <a href="/" className="menu-link menu-link-active">Mural</a>
            <a href="/enviar" className="menu-link menu-link-accent">Enviar História (login)</a>
            {isAuthenticated || isAdminAuthenticated ? (
              <>
                <a href="/minhas-historias" className="menu-link menu-link-accent">Minhas histórias</a>
                {isAdminAuthenticated && <a href="/admin" className="menu-link menu-link-admin">Admin</a>}
                <button
                  onClick={() => {
                    sessionStorage.removeItem('token')
                    sessionStorage.removeItem('admin_token')
                    sessionStorage.removeItem('username')
                    setIsAuthenticated(false)
                    setIsAdminAuthenticated(false)
                    window.location.href = '/'
                  }}
                  className="menu-link menu-link-quiet"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="menu-link menu-link-quiet">Entrar</a>
                <a href="/register" className="menu-link menu-link-accent">Cadastrar</a>
                <a href="/admin/login" className="menu-link menu-link-quiet" title="Acesso da equipe de curadoria">Curadoria</a>
              </>
            )}
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/enviar" element={<ProtectedRoute isAuth={isAuthenticated || isAdminAuthenticated}><Submit /></ProtectedRoute>} />
        <Route path="/minhas-historias" element={<ProtectedRoute isAuth={isAuthenticated || isAdminAuthenticated}><MyStories /></ProtectedRoute>} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  )
}
