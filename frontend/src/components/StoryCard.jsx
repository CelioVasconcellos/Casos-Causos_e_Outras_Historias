const EMOJI_ORDER = ['❤️', '🙏', '👏', '😮', '😢', '🌟']

export default function StoryCard({ story, reactionData, reactionPending, onToggleReaction }) {
  const totals = reactionData?.totals || {}
  const myReactions = new Set(reactionData?.my_reactions || [])

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
        <img src={story.media_url} alt={story.title} className="w-full rounded-lg mb-3 max-h-96 object-cover" />
      )}
      
      {story.media_url && story.media_type === 'video' && (
        <video src={story.media_url} controls className="w-full rounded-lg mb-3 max-h-96" />
      )}
      
      <p className="story-copy leading-relaxed">
        {story.story_text.length > 300 
          ? story.story_text.substring(0, 300) + '...' 
          : story.story_text
        }
      </p>
      
      {story.story_text.length > 300 && (
        <button className="read-more mt-3 font-semibold">
          Ler mais
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
