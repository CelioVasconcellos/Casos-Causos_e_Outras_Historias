import { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation } from 'react-router-dom'
import StoryForm from '../components/StoryForm'

export default function Submit() {
  const location = useLocation()
  const [stories, setStories] = useState([])
  const [storyToEdit, setStoryToEdit] = useState(location.state?.storyToEdit || null)

  const fetchMyStories = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token')
      const { data } = await axios.get('/api/stories/mine', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStories(data)
    } catch (error) {
      setStories([])
    }
  }

  useEffect(() => {
    fetchMyStories()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-2 text-center text-gray-900">Compartilhe Sua História</h1>
        <p className="text-center text-gray-600 mb-8">Sua narrativa importa para nossa comunidade</p>
        {stories.some(story => story.status === 'needs_revision') && (
          <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
            <h2 className="mb-3 font-bold text-yellow-900">Histórias que precisam de correção</h2>
            {stories.filter(story => story.status === 'needs_revision').map(story => (
              <div key={story.id} className="mb-3 last:mb-0">
                <p className="font-semibold text-yellow-900">{story.title}</p>
                <p className="text-sm text-yellow-800">Orientação: {story.moderation_note || 'Revise o conteúdo e envie novamente.'}</p>
                <button type="button" onClick={() => setStoryToEdit(story)} className="mt-2 rounded bg-yellow-500 px-3 py-1 text-sm font-semibold text-yellow-950 hover:bg-yellow-400">
                  Corrigir e reenviar
                </button>
              </div>
            ))}
          </div>
        )}
        <StoryForm storyToEdit={storyToEdit} onSuccess={() => { setStoryToEdit(null); fetchMyStories() }} />
      </div>
    </div>
  )
}
