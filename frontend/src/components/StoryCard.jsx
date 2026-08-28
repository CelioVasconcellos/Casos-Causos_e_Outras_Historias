import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

const EMOJI_ORDER = ['❤️', '🙏', '👏', '😮', '😢', '🌟']
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

function resolveMediaUrl(mediaUrl) {
  if (!mediaUrl) return ''
  // URL absoluta (storage externo como R2/S3) já vem pronta
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl
  // Caminho relativo /uploads/... aponta para o backend
  return `${API_BASE_URL}${mediaUrl}`
}

export default function StoryCard({ story, reactionData, reactionPending, onToggleReaction, onVisible }) {
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentMessage, setCommentMessage] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const cardRef = useRef(null)
  const totals = reactionData?.totals || {}
  const myReactions = new Set(reactionData?.my_reactions || [])
  const mediaSrc = resolveMediaUrl(story.media_url)

  useEffect(() => {
    if (typeof story.id !== 'number' || !onVisible || !cardRef.current) return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        onVisible(story.id)
        observer.disconnect()
      }
    }, { threshold: 0.5 })
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [story.id, onVisible])

  useEffect(() => {
    let active = true
    axios.get(`/api/stories/${story.id}/comments`)
      .then(({ data }) => { if (active) setComments(data) })
      .catch(() => { if (active) setComments([]) })
    return () => { active = false }
  }, [story.id])

  const submitComment = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token')
    if (!token) {
      setCommentMessage('Entre na sua conta para enviar um comentário.')
      return
    }
    if (commentText.trim().length < 10) {
      setCommentMessage('Escreva pelo menos 10 caracteres.')
      return
    }
    setCommentLoading(true)
    setCommentMessage('')
    try {
      await axios.post(`/api/stories/${story.id}/comments`, { comment_text: commentText.trim() }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCommentText('')
      setCommentMessage('Obrigado! Seu comentário foi enviado para curadoria.')
    } catch (error) {
      setCommentMessage(error.response?.data?.detail || 'Não foi possível enviar o comentário.')
    } finally {
      setCommentLoading(false)
    }
  }

  return (
    <article ref={cardRef} className={`story-card story-card-${story.media_type || 'text'} mb-4`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="story-title text-xl font-bold">{story.title}</h3>
        <span className="story-category text-xs px-2 py-1 rounded">
          {story.category}
        </span>
      </div>
      
      <p className="story-meta text-sm mb-3">
        Por <strong>{story.author_name}</strong> • {new Date(story.created_at).toLocaleDateString('pt-BR')}
      </p>
      
      {story.media_url && story.media_type === 'image' && (
        <img src={mediaSrc} alt={story.title} className="w-full rounded-lg mb-3 max-h-[32rem] object-contain bg-gray-100" />
      )}
      
      {story.media_url && story.media_type === 'video' && (
        <video src={mediaSrc} controls preload="metadata" className="w-full rounded-lg mb-3 max-h-96" />
      )}

      {story.media_url && story.media_type === 'audio' && (
        <audio src={mediaSrc} controls preload="metadata" className="w-full mb-3" />
      )}
      
      <p className="story-copy leading-relaxed whitespace-pre-line">
        {expanded || story.story_text.length <= 300
          ? story.story_text
          : story.story_text.substring(0, 300) + '...'
        }
      </p>
      
      {story.story_text.length > 300 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="read-more mt-3 font-semibold"
        >
          {expanded ? 'Ler menos' : 'Ler mais'}
        </button>
      )}

      {typeof story.id === 'number' && (
        <div className="reaction-wrap mt-5">
          <p className="reaction-title">Reagir sem login</p>
          <p className="mb-3 text-sm text-slate-600">
            {reactionData?.views || 0} visualizações · {reactionData?.total_count || 0} interações
          </p>
          <div className="reaction-grid">
            {EMOJI_ORDER.map((emoji) => {
              const isActive = myReactions.has(emoji)
              return (
                <button
                  key={emoji}
                  type="button"
                  disabled={!!reactionPending}
                  onClick={() => onToggleReaction(story.id, emoji)}
                  className={`reaction-button ${isActive ? 'reaction-button-active' : ''}`}
                  aria-label={`Reagir com ${emoji}`}
                >
                  <span>{emoji}</span>
                  <span className="reaction-count">{totals[emoji] || 0}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <section className="mt-5 border-t border-slate-200 pt-4">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700">Comentários ({comments.length})</h4>
        {comments.length > 0 ? (
          <div className="mt-3 space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-600">{comment.author_name} · {new Date(comment.created_at).toLocaleDateString('pt-BR')}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{comment.comment_text}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-2 text-sm text-slate-500">Ainda não há comentários publicados.</p>}
        <form onSubmit={submitComment} className="mt-4">
          <label className="block text-sm font-semibold text-slate-700" htmlFor={`comment-${story.id}`}>Acrescente seu ponto de vista</label>
          <textarea
            id={`comment-${story.id}`}
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Escreva um comentário com pelo menos 10 caracteres..."
            rows="3"
            maxLength="2000"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" disabled={commentLoading} className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400">
            {commentLoading ? 'Enviando...' : 'Enviar comentário'}
          </button>
          {commentMessage && <p className="mt-2 text-sm text-slate-600">{commentMessage}</p>}
        </form>
      </section>
    </article>
  )
}
