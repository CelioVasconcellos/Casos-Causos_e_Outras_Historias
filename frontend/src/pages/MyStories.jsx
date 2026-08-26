import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

const statusLabels = {
  pending: 'Aguardando análise',
  needs_revision: 'Correção solicitada',
  approved: 'Publicada no mural',
}

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800',
  needs_revision: 'bg-orange-100 text-orange-800',
  approved: 'bg-emerald-100 text-emerald-800',
}

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

function resolveMediaUrl(mediaUrl) {
  if (!mediaUrl) return ''
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl
  return `${API_BASE_URL}${mediaUrl}`
}

export default function MyStories() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('admin_token')
        const { data } = await axios.get('/api/stories/mine', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setStories(data)
      } catch (requestError) {
        setError('Não foi possível carregar suas histórias.')
      } finally {
        setLoading(false)
      }
    }

    fetchStories()
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Seu acervo</p>
            <h1 className="text-4xl font-bold text-blue-950">Minhas histórias</h1>
            <p className="mt-2 text-slate-600">Acompanhe tudo o que você compartilhou no portal.</p>
          </div>
          <Link to="/enviar" className="rounded-full bg-yellow-400 px-5 py-3 font-bold text-blue-950 transition hover:bg-yellow-300">
            Contar nova história
          </Link>
        </div>

        {loading && <p className="text-slate-600">Carregando suas histórias...</p>}
        {error && <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
        {!loading && !error && stories.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-blue-950">Seu acervo ainda está vazio</h2>
            <p className="mt-2 text-slate-600">A primeira história pode começar aqui.</p>
            <Link to="/enviar" className="mt-5 inline-block rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700">
              Compartilhar história
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {stories.map(story => (
            <article key={story.id} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-blue-950">{story.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(story.created_at).toLocaleDateString('pt-BR')} · {story.category}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[story.status] || 'bg-slate-100 text-slate-700'}`}>
                  {statusLabels[story.status] || story.status}
                </span>
              </div>

              {story.moderation_note && (
                <div className="mt-4 rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-4 text-sm text-yellow-900">
                  <strong>Orientação do moderador:</strong> {story.moderation_note}
                </div>
              )}

              <p className="mt-4 leading-relaxed text-slate-700">{story.story_text}</p>
              {story.media_url && story.media_type === 'image' && <img src={resolveMediaUrl(story.media_url)} alt={story.title} className="mt-4 max-h-[32rem] w-full rounded-xl object-contain bg-gray-100" />}
              {story.media_url && story.media_type === 'video' && <video src={resolveMediaUrl(story.media_url)} controls preload="metadata" className="mt-4 max-h-72 w-full rounded-xl" />}
              {story.status === 'needs_revision' && (
                <Link to="/enviar" state={{ storyToEdit: story }} className="mt-4 inline-block font-bold text-orange-700 hover:text-orange-900">
                  Corrigir e reenviar
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
