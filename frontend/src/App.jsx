import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Feed from './pages/Feed'
import Submit from './pages/Submit'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Register from './pages/Register'

function ProtectedRoute({ children, isAuth }) {
  return isAuth ? children : <Navigate to="/login" />
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'))

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'))
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <Router>
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">
            <a href="/">Casos, Cousos e Outras Histórias</a>
          </h1>
          <div className="flex gap-4">
            <a href="/" className="text-gray-700 hover:text-blue-600">Mural</a>
            {isAuthenticated ? (
              <>
                <a href="/enviar" className="text-gray-700 hover:text-blue-600">Enviar História</a>
                <a href="/admin" className="text-gray-700 hover:text-red-600">Admin</a>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    setIsAuthenticated(false)
                    window.location.href = '/'
                  }}
                  className="text-gray-700 hover:text-red-600"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="text-gray-700 hover:text-blue-600">Entrar</a>
                <a href="/register" className="text-gray-700 hover:text-green-600">Cadastrar</a>
              </>
            )}
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/enviar" element={<ProtectedRoute isAuth={isAuthenticated}><Submit /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute isAuth={isAuthenticated}><Admin /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  )
}
