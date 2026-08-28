import { useState } from 'react'

const EMOJI_ORDER = ['❤️', '🙏', '👏', '😮', '😢', '🌟']
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

function resolveMediaUrl(mediaUrl) {
  if (!mediaUrl) return ''
  // URL absoluta (storage externo como R2/S3) já vem pronta
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl
  // Caminho relativo /uploads/... aponta para o backend
  return `${API_BASE_URL}${mediaUrl}`
}

export default function StoryCard({ story, reactionData, reactionPending, onToggleReaction }) {
  const [expanded, setExpanded] = useState(false)
  const totals = reactionData?.totals || {}
  const myReactions = new Set(reactionData?.my_reactions || [])
  const mediaSrc = resolveMediaUrl(story.media_url)

  return (
    <article className={`story-card story-card-${story.media_type || 'text'} mb-4`}>
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
    </article>
  )
}
