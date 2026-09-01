import { useState, useEffect } from 'react'
import axios from 'axios'
import AdminComments from './AdminComments'

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
  const [showComments, setShowComments] = useState(false)

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
      const token = sessionStorage.getItem('admin_token')
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
      const token = sessionStorage.getItem('admin_token')
      await axios.put(`/api/admin/stories/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchStories()
    } catch (error) {
      console.error('Erro ao atualizar')
    }
  }

  const updateMetadata = async (event, id) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    try {
      const token = sessionStorage.getItem('admin_token')
      await axios.put(`/api/admin/stories/${id}`, {
        title: formData.get('title'),
        category: formData.get('category'),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchStories()
    } catch (error) {
      console.error('Erro ao salvar título e classificação')
    }
  }

  const deleteStory = async (id, title) => {
    const message = filter === 'approved'
      ? `ATENÇÃO: "${title}" está PUBLICADA no mural.\n\nEla será removida do mural e guardada em Excluídas (recuperável). Continuar?`
      : `Excluir "${title}"? Ela ficará na aba Excluídas e pode ser restaurada.`
    if (confirm(message)) {
      try {
        const token = sessionStorage.getItem('admin_token')
        await axios.delete(`/api/admin/stories/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        fetchStories()
      } catch (error) {
        console.error('Erro ao deletar')
      }
    }
  }

  const restoreStory = async (id) => {
    try {
      const token = sessionStorage.getItem('admin_token')
      await axios.post(`/api/admin/stories/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchStories()
    } catch (error) {
      console.error('Erro ao restaurar')
    }
  }

  const deletePermanently = async (id, title) => {
    const message = `EXCLUSÃO DEFINITIVA de "${title}".\n\nIsso remove o registro E a mídia do armazenamento, sem possibilidade de recuperação. Continuar?`
    if (confirm(message)) {
      try {
        const token = sessionStorage.getItem('admin_token')
        await axios.delete(`/api/admin/stories/${id}/permanent`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        fetchStories()
      } catch (error) {
        console.error('Erro ao excluir definitivamente')
      }
    }
  }

  const requestRevision = async (id) => {
    const note = window.prompt('Explique ao autor o que precisa ser corrigido:')
    if (!note || !note.trim()) return

    try {
      const token = sessionStorage.getItem('admin_token')
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

      <div className="mb-6 flex gap-2">
        <button onClick={() => setShowComments(false)} className={`rounded-lg px-4 py-2 font-semibold ${!showComments ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Histórias</button>
        <button onClick={() => setShowComments(true)} className={`rounded-lg px-4 py-2 font-semibold ${showComments ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Comentários</button>
      </div>

      {showComments ? <AdminComments /> : <>

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
      
      <div className="mb-6 flex gap-2 flex-wrap">
        {['pending', 'needs_revision', 'approved', 'deleted'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-semibold ${filter === status ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {status === 'pending' ? 'Pendentes' : status === 'needs_revision' ? 'Correções' : status === 'approved' ? 'Aprovadas' : 'Excluídas'}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="space-y-4">
          {stories.map(story => (
            <div key={story.id} className="bg-white p-4 rounded-lg shadow-md">
              <form onSubmit={(event) => updateMetadata(event, story.id)} className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end">
                <label className="text-sm font-semibold text-gray-700">
                  Título
                  <input
                    name="title"
                    defaultValue={story.title}
                    minLength="5"
                    maxLength="150"
                    required
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal"
                  />
                </label>
                <label className="text-sm font-semibold text-gray-700">
                  Classificação
                  <select name="category" defaultValue={story.category || 'Geral'} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal">
                    <option>Geral</option>
                    <option>Espirituais</option>
                    <option>Festas & Celebrações</option>
                    <option>Aprendizados</option>
                    <option>Relacionamentos</option>
                    <option>Vida & Viagens</option>
                  </select>
                </label>
                <button type="submit" className="rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700">
                  Salvar dados
                </button>
              </form>
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
              {story.media_url && story.media_type === 'audio' && (
                <audio src={resolveMediaUrl(story.media_url)} controls preload="metadata" className="mb-4 w-full" />
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
                {filter === 'deleted' ? (
                  <>
                    <button
                      onClick={() => restoreStory(story.id)}
                      className="bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700"
                    >
                      Restaurar
                    </button>
                    <button
                      onClick={() => deletePermanently(story.id, story.title)}
                      className="bg-red-800 text-white px-3 py-1 rounded hover:bg-red-900"
                    >
                      Excluir definitivamente
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => deleteStory(story.id, story.title)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    {filter === 'approved' ? 'Excluir do mural' : 'Deletar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </>}
    </div>
  )
}
