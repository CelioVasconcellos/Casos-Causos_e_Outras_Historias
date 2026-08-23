import { useState, useEffect } from 'react'
import axios from 'axios'

export default function AdminDashboard() {
  const [stories, setStories] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStories()
  }, [filter])

  const fetchStories = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const { data } = await axios.get('/api/admin/stories', {
        params: { status_filter: filter },
        headers: { Authorization: Bearer \ }
      })
      setStories(data)
    } catch (error) {
      console.error('Erro ao buscar histórias')
    }
    setLoading(false)
  }

  const updateStory = async (id, status) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(\/api/admin/stories/\\, { status }, {
        headers: { Authorization: \Bearer \\ }
      })
      fetchStories()
    } catch (error) {
      console.error('Erro ao atualizar')
    }
  }

  const deleteStory = async (id) => {
    if (confirm('Tem certeza que deseja deletar?')) {
      try {
        const token = localStorage.getItem('token')
        await axios.delete(\/api/admin/stories/\\, {
          headers: { Authorization: \Bearer \\ }
        })
        fetchStories()
      } catch (error) {
        console.error('Erro ao deletar')
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Painel de Moderação</h1>
      
      <div className="mb-6 flex gap-2">
        {['pending', 'approved', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={\px-4 py-2 rounded-lg font-semibold \\}
          >
            {status === 'pending' ? 'Pendentes' : status === 'approved' ? 'Aprovadas' : 'Rejeitadas'}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="space-y-4">
          {stories.map(story => (
            <div key={story.id} className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="font-bold text-lg">{story.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{story.author_name} • {story.category}</p>
              <p className="text-gray-700 mb-4">{story.story_text.substring(0, 200)}...</p>
              <div className="flex gap-2">
                {filter === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStory(story.id, 'approved')}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => updateStory(story.id, 'rejected')}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Rejeitar
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteStory(story.id)}
                  className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
