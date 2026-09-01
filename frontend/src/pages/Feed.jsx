import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import StoryCard from '../components/StoryCard'

const EMOJI_ORDER = ['❤️', '🙏', '👏', '😮', '😢', '🌟']

function createEmptyReactionSummary(storyId) {
  return {
    story_id: storyId,
    totals: Object.fromEntries(EMOJI_ORDER.map((emoji) => [emoji, 0])),
    my_reactions: [],
    total_count: 0,
  }
}

export default function Feed() {
  const { category: categoryFromUrl } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isCategoryDirectory = pathname === '/categorias'
  const [stories, setStories] = useState([])
  const [featuredStories, setFeaturedStories] = useState([])
  const [reactionMap, setReactionMap] = useState({})
  const [reactionBusyMap, setReactionBusyMap] = useState({})
  const [reactionNotice, setReactionNotice] = useState('')
  const [search, setSearch] = useState('')
  const [author, setAuthor] = useState('')
  const [title, setTitle] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const viewedStoriesRef = useRef(new Set())

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('/api/stories/categories/all')
      setCategories(data)
    } catch (_ignored) {
      setCategories([])
    }
  }

  const filterStories = (sourceStories) => {
    const normalizedSearch = search.trim().toLowerCase()
    const normalizedAuthor = author.trim().toLowerCase()
    const normalizedTitle = title.trim().toLowerCase()
    const startDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
    const endDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null

    return sourceStories.filter((story) => {
      const storyDate = new Date(story.created_at)
      return (
        (!normalizedSearch || story.title.toLowerCase().includes(normalizedSearch) || story.story_text.toLowerCase().includes(normalizedSearch) || story.author_name.toLowerCase().includes(normalizedSearch)) &&
        (!normalizedAuthor || story.author_name.toLowerCase().includes(normalizedAuthor)) &&
        (!normalizedTitle || story.title.toLowerCase().includes(normalizedTitle)) &&
        (!startDate || storyDate >= startDate) &&
        (!endDate || storyDate <= endDate)
      )
    })
  }

  const fetchReactionSummaries = async (sourceStories) => {
    const realStories = sourceStories.filter((story) => typeof story.id === 'number')
    if (realStories.length === 0) return

    try {
      const { data } = await axios.get('/api/stories/reactions/bulk', {
        params: { story_ids: realStories.map((story) => story.id) },
        paramsSerializer: { indexes: null },
      })
      const nextMap = {}
      for (const story of realStories) nextMap[story.id] = createEmptyReactionSummary(story.id)
      for (const item of data.items || []) {
        nextMap[item.story_id] = {
          ...createEmptyReactionSummary(item.story_id),
          ...item,
          totals: { ...createEmptyReactionSummary(item.story_id).totals, ...(item.totals || {}) },
          views: item.views || 0,
        }
      }
      setReactionMap(nextMap)
    } catch (_ignored) {
      setReactionMap({})
    }
  }

  const fetchStories = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/stories', { params: { search, category: categoryFromUrl } })
      const filteredStories = filterStories(data)
      setStories(filteredStories)
      fetchReactionSummaries(filteredStories)
    } catch (_ignored) {
      setStories([])
      setReactionMap({})
    } finally {
      setLoading(false)
    }
  }

  const fetchFeaturedStories = async () => {
    try {
      const { data } = await axios.get('/api/stories/featured')
      setFeaturedStories([
        { label: 'Mais recente', story: data.latest },
        { label: 'Mais lida', story: data.most_viewed },
      ].filter((item) => item.story))
    } catch (_ignored) {
      setFeaturedStories([])
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (categoryFromUrl) {
      fetchStories()
    } else {
      setStories([])
      setReactionMap({})
      if (!isCategoryDirectory) fetchFeaturedStories()
    }
  }, [categoryFromUrl, isCategoryDirectory])

  useEffect(() => {
    if (categoryFromUrl) fetchStories()
  }, [search, author, title, categoryFromUrl, dateFrom, dateTo])

  const registerStoryView = useCallback(async (storyId) => {
    if (viewedStoriesRef.current.has(storyId)) return
    viewedStoriesRef.current.add(storyId)
    try {
      const token = sessionStorage.getItem('token') || sessionStorage.getItem('admin_token')
      const { data } = await axios.post('/api/stories/views/bulk', null, {
        params: { story_ids: storyId },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const viewItem = data.items?.find((item) => item.story_id === storyId)
      if (viewItem) {
        setReactionMap((previous) => ({
          ...previous,
          [storyId]: { ...(previous[storyId] || createEmptyReactionSummary(storyId)), views: viewItem.views },
        }))
      }
    } catch (_ignored) {
      // A falha no contador não impede a leitura ou a reação.
    }
  }, [])

  const toggleReaction = async (storyId, emoji) => {
    if (reactionBusyMap[storyId]) return
    setReactionNotice('')
    setReactionBusyMap((previous) => ({ ...previous, [storyId]: true }))
    try {
      const { data } = await axios.post(`/api/stories/${storyId}/reactions`, { emoji })
      setReactionMap((previous) => ({
        ...previous,
        [storyId]: { ...data, views: previous[storyId]?.views || 0 },
      }))
    } catch (error) {
      setReactionNotice(error.response?.data?.detail || 'Não foi possível registrar sua reação agora.')
    } finally {
      setReactionBusyMap((previous) => ({ ...previous, [storyId]: false }))
    }
  }

  const storyExcerpt = (story) => (
    story.story_text.length > 180 ? `${story.story_text.substring(0, 180)}...` : story.story_text
  )

  return (
    <div className={`feed-page min-h-screen py-8 ${categoryFromUrl || isCategoryDirectory ? 'category-page' : 'home-page'}`}>
      <div className="max-w-4xl mx-auto px-4">
        {!categoryFromUrl && !isCategoryDirectory && <div className="feed-intro">
          <span className="feed-spark">um lugar para lembrar</span>
          <h1 className="feed-title text-4xl font-bold mb-2 text-center">Casos, Causos e Outras Histórias</h1>
          <p className="text-center mb-2">Memórias, aprendizados e testemunhos que fortalecem o cuidado coletivo.</p>
          <p className="text-center mb-8">Este mural é eclético: escolha uma categoria ou sugira uma nova ao compartilhar sua história.</p>
        </div>}

        {isCategoryDirectory && <section className="category-page-intro mb-8">
          <Link to="/" className="category-back-link">Voltar ao mural</Link>
          <p>Explore o acervo</p>
          <h1>Histórias por categoria</h1>
          <span>Escolha um tema para encontrar histórias completas.</span>
        </section>}

        {isCategoryDirectory && categories.length > 0 && (
          <section className="category-directory category-directory-page mb-8" aria-label="Categorias do mural">
            <div><p className="category-directory-kicker">Explore o acervo</p><h2>Histórias por categoria</h2></div>
            <div className="category-directory-links">
              {categories.map((item) => <Link key={item} to={`/categorias/${encodeURIComponent(item)}`} className="category-directory-link">{item}</Link>)}
            </div>
          </section>
        )}

        {!categoryFromUrl && !isCategoryDirectory && <section className="home-purpose-panel mb-8">
          <p>Um acervo em movimento</p>
          <h2>Histórias que ficam</h2>
          <span>Cada relato acrescenta uma memória ao mural e ajuda outras pessoas a reconhecer experiências, ideias e caminhos.</span>
        </section>}

        {!categoryFromUrl && !isCategoryDirectory && featuredStories.length > 0 && (
          <section className="featured-panel mb-8" aria-label="Histórias em destaque">
            <div className="featured-heading"><div><p className="highlights-kicker">Para começar</p><h2>Histórias em destaque</h2></div></div>
            <div className="featured-grid">
              {featuredStories.map(({ label, story }) => (
                <Link key={label} to={`/categorias/${encodeURIComponent(story.category)}#story-${story.id}`} className="featured-item">
                  <span className="featured-label">{label}</span><span className="featured-category">{story.category}</span>
                  <strong>{story.title}</strong><p>{storyExcerpt(story)}</p><small>Por {story.author_name}</small>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!categoryFromUrl && !isCategoryDirectory && <section className="participation-panel mb-8"><h2 className="participation-title">Como participar do mural</h2><p className="participation-copy">Leitura e reações são abertas a todos. Para enviar uma história nova, é preciso entrar com sua conta.</p><p className="participation-foot">Ao continuar, você concorda em usar o mural com respeito às memórias compartilhadas.</p></section>}

        {categoryFromUrl && <>
          <section className="category-page-intro mb-8">
            <Link to="/" className="category-back-link">Voltar ao mural</Link>
            <p>Acervo por categoria</p>
            <h1>{categoryFromUrl}</h1>
            <span>Histórias completas reunidas em um só lugar.</span>
          </section>
          <div className="filter-panel mb-8">
            <div className="filter-heading"><div><p className="filter-kicker">Busca na categoria</p><h2 className="filter-title">{categoryFromUrl}</h2></div></div>
            <input type="text" placeholder="Digite uma palavra, título ou nome de autor..." value={search} onChange={(event) => setSearch(event.target.value)} className="filter-input filter-search mb-4" />
            <div className="filter-grid">
              <input type="text" placeholder="Nome do autor" value={author} onChange={(event) => setAuthor(event.target.value)} className="filter-input" />
              <input type="text" placeholder="Título da história" value={title} onChange={(event) => setTitle(event.target.value)} className="filter-input" />
              <select value={categoryFromUrl} onChange={(event) => navigate(`/categorias/${encodeURIComponent(event.target.value)}`)} className="filter-input">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <label className="date-field"><span>De</span><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="filter-input" /></label>
              <label className="date-field"><span>Até</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="filter-input" /></label>
            </div>
            <p className="filter-result">{stories.length} {stories.length === 1 ? 'história encontrada' : 'histórias encontradas'}</p>
          </div>

          <section className="story-feed-area">
            <div className="story-feed-heading"><span>Histórias: {categoryFromUrl}</span><span className="story-feed-line" /></div>
            {loading ? <p className="text-center text-white">Carregando histórias...</p> : stories.length > 0 ? <div>{stories.map((story) => <StoryCard key={story.id} story={story} reactionData={reactionMap[story.id]} reactionPending={reactionBusyMap[story.id]} onToggleReaction={toggleReaction} onVisible={registerStoryView} />)}</div> : <p className="text-center text-white">Ainda não há histórias na categoria &quot;{categoryFromUrl}&quot; até o momento. Seja a primeira pessoa a compartilhar uma!</p>}
            {reactionNotice && <p className="reaction-notice">{reactionNotice}</p>}
          </section>
        </>}
      </div>
    </div>
  )
}
