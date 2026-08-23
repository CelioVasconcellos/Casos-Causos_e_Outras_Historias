import { useState, useEffect } from 'react'
import axios from 'axios'
import StoryCard from '../components/StoryCard'

export default function Feed() {
  const [stories, setStories] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStories()
    fetchCategories()
  }, [search, category])

  const fetchStories = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/stories', {
        params: { search, category }
      })
      setStories(data)
    } catch (error) {
      console.error('Erro ao buscar histórias')
    }
    setLoading(false)
  }

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('/api/stories/categories/all')
      setCategories(data)
    } catch (error) {
      console.error('Erro ao buscar categorias')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-2 text-center text-gray-900">Casos, Cousos e Outras Histórias</h1>
        <p className="text-center text-gray-600 mb-8">Um mural comunitário de narrativas e experiências</p>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <input
            type="text"
            placeholder="Buscar histórias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-600">Carregando histórias...</p>
        ) : stories.length > 0 ? (
          <div>
            {stories.map(story => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">Nenhuma história encontrada.</p>
        )}
      </div>
    </div>
  )
}
