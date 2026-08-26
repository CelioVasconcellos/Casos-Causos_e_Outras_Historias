import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.post('/api/admin/login', { username, password })
      localStorage.setItem('admin_token', data.access_token)
      localStorage.setItem('username', username)
      // Avisa o App.jsx que a autenticacao mudou (o evento 'storage' nao dispara sozinho na mesma aba)
      window.dispatchEvent(new Event('storage'))
      navigate('/admin')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Não foi possível entrar no painel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-emerald-800 px-4 py-10">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Área restrita</p>
        <h1 className="mb-2 text-center text-3xl font-bold text-blue-950">Painel do moderador</h1>
        <p className="mb-8 text-center text-sm text-slate-600">Acompanhe e cuide das histórias enviadas.</p>

        <label className="mb-4 block text-sm font-semibold text-slate-700">
          Usuário
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoComplete="username"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />
        </label>

        <label className="mb-4 block text-sm font-semibold text-slate-700">
          Senha
          <div className="relative mt-2">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-24 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(current => !current)}
              className="absolute inset-y-0 right-2 my-1 rounded px-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </label>

        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-yellow-400 px-4 py-3 font-bold text-blue-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Entrando...' : 'Entrar no painel'}
        </button>
      </form>
    </main>
  )
}
