import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import EmojiPicker from 'emoji-picker-react'

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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const cardRef = useRef(null)
  const commentInputRef = useRef(null)
  const totals = reactionData?.totals || {}
  const myReactions = new Set(reactionData?.my_reactions || [])
  const mediaSrc = resolveMediaUrl(story.media_url)

  useEffect(() => {
    if (typeof story.id !== 'number' || !onVisible || !cardRef.current) return undefined

    let readingTimer
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        readingTimer = window.setTimeout(() => {
          onVisible(story.id)
          observer.disconnect()
        }, 2000)
      } else if (readingTimer) {
        window.clearTimeout(readingTimer)
        readingTimer = undefined
      }
    }, { threshold: 0.2 })
    observer.observe(cardRef.current)
    return () => {
      if (readingTimer) window.clearTimeout(readingTimer)
      observer.disconnect()
    }
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
      window.alert('Seu comentário precisa ter pelo menos 10 caracteres.')
      setCommentMessage('Escreva pelo menos 10 caracteres para enviar o comentário.')
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

  const addEmoji = (emojiData) => {
    const input = commentInputRef.current
    const cursorStart = input?.selectionStart ?? commentText.length
    const cursorEnd = input?.selectionEnd ?? commentText.length
    const nextText = `${commentText.slice(0, cursorStart)}${emojiData.emoji}${commentText.slice(cursorEnd)}`
    setCommentText(nextText)
    setEmojiPickerOpen(false)
    window.requestAnimationFrame(() => {
      if (!input) return
      const nextCursor = cursorStart + emojiData.emoji.length
      input.focus()
      input.setSelectionRange(nextCursor, nextCursor)
    })
  }

  return (
    <article id={`story-${story.id}`} ref={cardRef} className={`story-card story-card-${story.media_type || 'text'} mb-4`}>
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
      
      <p
        className="story-copy leading-relaxed whitespace-pre-line select-none"
        onCopy={(event) => event.preventDefault()}
        onCut={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
      >
        {expanded || story.story_text.length <= 300
          ? story.story_text
          : story.story_text.substring(0, 300) + '...'
        }
      </p>
      <p className="story-copy-notice">Este relato é protegido; a cópia do texto não está disponível.</p>
      
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
            ref={commentInputRef}
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Escreva um comentário com pelo menos 10 caracteres..."
            rows="3"
            maxLength="2000"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setEmojiPickerOpen(open => !open)}
              aria-expanded={emojiPickerOpen}
              aria-controls={`emoji-picker-${story.id}`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              😀 Adicionar emoji
            </button>
            {emojiPickerOpen && (
              <div id={`emoji-picker-${story.id}`} className="absolute bottom-full left-0 z-10 mb-2 max-w-full overflow-hidden rounded-lg shadow-lg">
                <EmojiPicker onEmojiClick={addEmoji} width={320} height={380} lazyLoadEmojis previewConfig={{ showPreview: false }} />
              </div>
            )}
          </div>
          <button type="submit" disabled={commentLoading} className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400">
            {commentLoading ? 'Enviando...' : 'Enviar comentário'}
          </button>
          {commentMessage && <p className="mt-2 text-sm text-slate-600">{commentMessage}</p>}
        </form>
      </section>
    </article>
  )
}
