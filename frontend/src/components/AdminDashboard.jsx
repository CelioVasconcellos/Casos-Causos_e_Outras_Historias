import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

function resolveMediaUrl(mediaUrl) {
  if (!mediaUrl) return ''
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl
  return `${API_BASE_URL}${mediaUrl}`
}

function AdminStoryText({ text }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return null
  if (text.length <= 300) {
    return <p className="text-gray-700 mb-4 whitespace-pre-line">{text}</p>
  }
  return (
    <>
      <p className="text-gray-700 mb-2 whitespace-pre-line">
        {expanded ? text : text.substring(0, 300) + '...'}
      </p>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mb-4 text-sm font-semibold text-blue-600 hover:text-blue-800"
      >
        {expanded ? 'Ler menos' : 'Ler mais'}
      </button>
    </>
  )
}

export default function AdminDashboard() {
  const [stories, setStories] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [platformCounters, setPlatformCounters] = useState(null)

  useEffect(() => {
    fetchStories()
  }, [filter])

  useEffect(() => {
    const fetchCounters = async () => {
      try {
        const { data } = await axios.get('/api/stats/summary')
        setPlatformCounters(data)
      } catch (_ignored) {
        // Silencia falhas de telemetria no painel.
      }
    }

    fetchCounters()
    const intervalId = window.setInterval(fetchCounters, 60 * 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  const formatDayLabel = (isoDate) => {
    if (!isoDate) return '--'
    const [year, month, day] = isoDate.split('-')
    return `${day}/${month}`
  }

  const fetchStories = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const { data } = await axios.get('/api/admin/stories', {
        params: { status_filter: filter },
        headers: { Authorization: `Bearer ${token}` }
      })
      setStories(data)
    } catch (error) {
      console.error('Erro ao buscar histórias')
    }
    setLoading(false)
  }

  const updateStory = async (id, status) => {
    try {
      const token = localStorage.getItem('admin_token')
      await axios.put(`/api/admin/stories/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchStories()
    } catch (error) {
      console.error('Erro ao atualizar')
    }
  }

  const deleteStory = async (id, title) => {
    const message = filter === 'approved'
      ? `ATENÇÃO: "${title}" está PUBLICADA no mural e visível para todos.\n\nExcluir remove a história e a mídia definitivamente. Continuar?`
      : `Excluir "${title}" definitivamente (incluindo a mídia)?`
    if (confirm(message)) {
      try {
        const token = localStorage.getItem('admin_token')
        await axios.delete(`/api/admin/stories/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        fetchStories()
      } catch (error) {
        console.error('Erro ao deletar')
      }
    }
  }

  const requestRevision = async (id) => {
    const note = window.prompt('Explique ao autor o que precisa ser corrigido:')
    if (!note || !note.trim()) return

    try {
      const token = localStorage.getItem('admin_token')
      await axios.put(`/api/admin/stories/${id}`, {
        status: 'needs_revision',
        moderation_note: note.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchStories()
    } catch (error) {
      console.error('Erro ao solicitar correção')
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Painel de Moderação</h1>

      {platformCounters && (
        <section className="platform-counters mb-8">
          <h2 className="text-lg font-semibold mb-3">Visitas da plataforma</h2>
          <p><strong>{platformCounters.unique_anonymous_visitors}</strong> visitantes únicos sem login</p>
          <p><strong>{platformCounters.active_logged_users}</strong> usuários logados ativos (janela de {platformCounters.active_window_minutes} min)</p>
          <p><strong>{platformCounters.tracked_logged_users}</strong> usuários logados já registrados na plataforma</p>
          <p><strong>{platformCounters.visits_today}</strong> visitas únicas hoje</p>
          <p><strong>{platformCounters.visits_last_7_days}</strong> visitas únicas nos últimos 7 dias</p>
          <p><strong>{platformCounters.visits_last_30_days}</strong> visitas únicas nos últimos 30 dias</p>
          {platformCounters.daily_visits_last_7_days.length > 0 && (
            <div className="daily-visit-list" aria-label="Visitas diárias dos últimos 7 dias">
              {platformCounters.daily_visits_last_7_days.map((item) => (
                <div key={item.date} className="daily-visit-item">
                  <span>{formatDayLabel(item.date)}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      
      <div className="mb-6 flex gap-2">
        {['pending', 'needs_revision', 'approved'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-semibold ${filter === status ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {status === 'pending' ? 'Pendentes' : status === 'needs_revision' ? 'Correções' : 'Aprovadas'}
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

              {story.media_url && story.media_type === 'image' && (
                <img
                  src={resolveMediaUrl(story.media_url)}
                  alt={story.title}
                  className="mb-4 max-h-[32rem] w-full rounded-lg object-contain bg-gray-100"
                />
              )}
              {story.media_url && story.media_type === 'video' && (
                <video
                  src={resolveMediaUrl(story.media_url)}
                  controls
                  preload="metadata"
                  className="mb-4 max-h-96 w-full rounded-lg"
                />
              )}

              <AdminStoryText text={story.story_text} />
              {story.moderation_note && (
                <p className="mb-4 rounded bg-yellow-50 p-3 text-sm text-yellow-800">
                  Orientação ao autor: {story.moderation_note}
                </p>
              )}
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
                      onClick={() => requestRevision(story.id)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    >
                      Solicitar correção
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteStory(story.id, story.title)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  {filter === 'approved' ? 'Excluir do mural' : 'Deletar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
