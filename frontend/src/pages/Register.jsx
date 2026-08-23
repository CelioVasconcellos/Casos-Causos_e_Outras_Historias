import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/auth/register', { username, password })
      navigate('/login')
    } catch (error) {
      setError('Erro ao registrar')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Criar Conta</h2>
        
        <input
          type="text"
          placeholder="Escolha um usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        
        <input
          type="password"
          placeholder="Escolha uma senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Criando...' : 'Criar Conta'}
        </button>
        
        <p className="text-center text-sm mt-4 text-gray-600">
          Já tem conta? <a href="/login" className="text-green-600 font-semibold">Entre</a>
        </p>
      </form>
    </div>
  )
}
