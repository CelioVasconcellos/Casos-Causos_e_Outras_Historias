import { useState } from 'react'
import axios from 'axios'

export default function StoryForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    author_name: '',
    category: 'Geral',
    story_text: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/stories', formData, {
        headers: { Authorization: Bearer \ }
      })
      setMessage('Obrigado! Seu relato foi enviado para curadoria.')
      setFormData({ title: '', author_name: '', category: 'Geral', story_text: '' })
      if (onSuccess) onSuccess()
    } catch (error) {
      setMessage('Erro ao enviar. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Compartilhe Sua História</h2>
      
      <input
        type="text"
        name="author_name"
        placeholder="Seu nome"
        value={formData.author_name}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <input
        type="text"
        name="title"
        placeholder="Título da história"
        value={formData.title}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <select
        name="category"
        value={formData.category}
        onChange={handleChange}
        className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option>Geral</option>
        <option>Espirituais</option>
        <option>Festas & Celebrações</option>
        <option>Aprendizados</option>
        <option>Relacionamentos</option>
        <option>Vida & Viagens</option>
      </select>
      
      <textarea
        name="story_text"
        placeholder="Conte sua história..."
        value={formData.story_text}
        onChange={handleChange}
        required
        rows="8"
        className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Enviando...' : 'Enviar Relato'}
      </button>
      
      {message && <p className="mt-4 text-center text-green-600">{message}</p>}
    </form>
  )
}
