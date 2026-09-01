import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import StoryCard from '../components/StoryCard'

const demoStories = [
  {
    id: 'demo-text',
    title: 'A janela que ficou acesa',
    author_name: 'Lia Martins',
    category: 'Cotidiano',
    created_at: '2026-08-18T12:00:00.000Z',
    media_url: null,
    media_type: null,
    story_text: 'Toda noite, ao voltar para casa, Lia via uma janela acesa no prédio da frente. Numa terça-feira de chuva, deixou um bilhete na portaria perguntando quem morava ali. No dia seguinte, encontrou uma resposta: era a luz que o avô de Raul havia instalado para que ele nunca esquecesse o caminho de volta. Desde então, os dois passaram a trocar histórias por bilhetes, até que a janela deixou de ser apenas uma luz distante.',
  },
  {
    id: 'demo-image',
    title: 'O quintal depois da chuva',
    author_name: 'Caio Nunes',
    category: 'Memórias',
    created_at: '2026-08-15T12:00:00.000Z',
    media_url: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=1200&q=85',
    media_type: 'image',
    story_text: 'Quando a chuva termina, o quintal devolve cheiros que pareciam esquecidos. Caio conta que foi ali, entre vasos e ferramentas antigas, que aprendeu com a avó a reconhecer o tempo pelo silêncio das folhas.',
  },
  {
    id: 'demo-video',
    title: 'Três minutos de mar',
    author_name: 'Marina Alves',
    category: 'Viagens',
    created_at: '2026-08-11T12:00:00.000Z',
    media_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    media_type: 'video',
    story_text: 'Marina gravou este pequeno trecho numa manhã em que decidiu caminhar sem destino. O vídeo virou sua forma preferida de guardar a sensação de recomeço: simples, breve e impossível de repetir exatamente.',
  },
]

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
  const [stories, setStories] = useState([])
  const [highlights, setHighlights] = useState([])
  const [reactionMap, setReactionMap] = useState({})
  const [reactionBusyMap, setReactionBusyMap] = useState({})
  const [reactionNotice, setReactionNotice] = useState('')
  const [search, setSearch] = useState('')
  const [author, setAuthor] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(categoryFromUrl || '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const viewedStoriesRef = useRef(new Set())

  useEffect(() => {
    fetchStories()
    fetchCategories()
    if (categoryFromUrl) {
      setHighlights([])
    } else {
      fetchHighlights()
    }
  }, [search, author, title, category, categoryFromUrl, dateFrom, dateTo])

  useEffect(() => {
    if (categoryFromUrl) setCategory(categoryFromUrl)
  }, [categoryFromUrl])

  const fetchStories = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/stories', {
        params: { search, category }
      })
      const filteredStories = filterStories(data)
      setStories(filteredStories)
      fetchReactionSummaries(filteredStories)
    } catch (error) {
      const fallbackStories = filterStories(demoStories)
      setStories(fallbackStories)
      setReactionMap({})
    }
    setLoading(false)
  }

  const fetchReactionSummaries = async (sourceStories) => {
    const realStories = sourceStories.filter((story) => typeof story.id === 'number')
    if (realStories.length === 0) {
      return
    }

    try {
      const { data } = await axios.get('/api/stories/reactions/bulk', {
        params: { story_ids: realStories.map((story) => story.id) },
        paramsSerializer: { indexes: null },
      })
      const nextMap = {}
      for (const story of realStories) {
        nextMap[story.id] = createEmptyReactionSummary(story.id)
      }
      for (const item of data.items || []) {
        nextMap[item.story_id] = {
          ...createEmptyReactionSummary(item.story_id),
          ...item,
          totals: {
            ...createEmptyReactionSummary(item.story_id).totals,
            ...(item.totals || {}),
          },
          views: item.views || 0,
        }
      }
      setReactionMap((previous) => ({ ...previous, ...nextMap }))
    } catch (_ignored) {
      // A falha no resumo não impede a leitura das histórias.
    }
  }

  const fetchHighlights = async () => {
    try {
      const { data } = await axios.get('/api/stories/highlights')
      setHighlights(data)
      fetchReactionSummaries(data)
    } catch (_ignored) {
      setHighlights([])
    }
  }

  const registerStoryView = useCallback(async (storyId) => {
    if (viewedStoriesRef.current.has(storyId)) return
    viewedStoriesRef.current.add(storyId)
    try {
      const { data } = await axios.post('/api/stories/views/bulk', null, {
        params: { story_ids: storyId },
        headers: (() => {
          const token = sessionStorage.getItem('token') || sessionStorage.getItem('admin_token')
          return token ? { Authorization: `Bearer ${token}` } : undefined
        })(),
      })
      const viewItem = data.items?.find((item) => item.story_id === storyId)
      if (viewItem) {
        setReactionMap((previous) => ({
          ...previous,
          [storyId]: {
            ...(previous[storyId] || createEmptyReactionSummary(storyId)),
            views: viewItem.views,
          },
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

    // Atualizacao otimista: aplica a mudanca imediatamente na UI
    setReactionMap((previous) => {
      const current = previous[storyId] || createEmptyReactionSummary(storyId)
      const alreadyMine = current.my_reactions.includes(emoji)
      const newTotals = { ...current.totals }
      newTotals[emoji] = (newTotals[emoji] || 0) + (alreadyMine ? 0 : 1)
      const newMine = alreadyMine ? current.my_reactions : [...current.my_reactions, emoji]
      return {
        ...previous,
        [storyId]: {
          ...current,
          totals: newTotals,
          my_reactions: newMine,
          total_count: Object.values(newTotals).reduce((a, b) => a + b, 0),
        },
      }
    })

    try {
      const { data } = await axios.post(`/api/stories/${storyId}/reactions`, { emoji })
      // Confirma com a resposta do servidor (fonte da verdade)
      setReactionMap((previous) => ({
        ...previous,
        [storyId]: { ...data, views: previous[storyId]?.views || 0 },
      }))
    } catch (error) {
      // Reverte a otimista em caso de erro: busca o estado real
      setReactionNotice(error.response?.data?.detail || 'Não foi possível registrar sua reação agora.')
      try {
        const { data } = await axios.get(`/api/stories/${storyId}/reactions`)
        setReactionMap((previous) => ({
          ...previous,
          [storyId]: { ...data, views: previous[storyId]?.views || 0 },
        }))
      } catch (_ignored) {}
    } finally {
      setReactionBusyMap((previous) => ({ ...previous, [storyId]: false }))
    }
  }

  const filterStories = (sourceStories) => {
    const normalizedSearch = search.trim().toLowerCase()
    const normalizedAuthor = author.trim().toLowerCase()
    const normalizedTitle = title.trim().toLowerCase()
    const startDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
    const endDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null

    return sourceStories.filter(story => {
      const storyDate = new Date(story.created_at)
      const matchesSearch = !normalizedSearch
        || story.title.toLowerCase().includes(normalizedSearch)
        || story.story_text.toLowerCase().includes(normalizedSearch)
        || story.author_name.toLowerCase().includes(normalizedSearch)
      const matchesAuthor = !normalizedAuthor || story.author_name.toLowerCase().includes(normalizedAuthor)
      const matchesTitle = !normalizedTitle || story.title.toLowerCase().includes(normalizedTitle)
      const matchesCategory = !category || story.category === category
      const matchesStartDate = !startDate || storyDate >= startDate
      const matchesEndDate = !endDate || storyDate <= endDate
      return matchesSearch && matchesAuthor && matchesTitle && matchesCategory && matchesStartDate && matchesEndDate
    })
  }

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('/api/stories/categories/all')
      setCategories(data)
    } catch (error) {
      setCategories([...new Set(demoStories.map(story => story.category))])
    }
  }

  return (
    <div className="feed-page min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="feed-intro">
          <span className="feed-spark">um lugar para lembrar</span>
          <h1 className="feed-title text-4xl font-bold mb-2 text-center">Casos, Causos e Outras Histórias</h1>
          <p className="text-center mb-2">Memórias, aprendizados e testemunhos que fortalecem o cuidado coletivo.</p>
          <p className="text-center mb-2">Nosso objetivo é preservar histórias para inspirar as próximas gerações.</p>
          <p className="text-center mb-8">Este mural é eclético: não é destinado a nenhuma categoria específica. Escolha a categoria que combina com sua história ou sugira uma nova.</p>
        </div>

        {!categoryFromUrl && categories.length > 0 && (
          <section id="categorias" className="category-directory mb-8" aria-label="Categorias do mural">
            <div>
              <p className="category-directory-kicker">Explore o acervo</p>
              <h2>Histórias por categoria</h2>
            </div>
            <div className="category-directory-links">
              {categories.map((item) => (
                <Link key={item} to={`/categorias/${encodeURIComponent(item)}`} className="category-directory-link">
                  {item}
                </Link>
              ))}
            </div>
          </section>
        )}

        {!categoryFromUrl && highlights.length > 0 && (
          <section className="highlights-panel mb-8" aria-label="Histórias em destaque">
            <div className="highlights-heading">
              <div>
                <p className="highlights-kicker">Para começar</p>
                <h2>Histórias em destaque</h2>
              </div>
              <span>Reações, comentários e leituras</span>
            </div>
            <div className="highlights-grid">
              {highlights.map((story) => (
                <a key={story.id} href={`/#story-${story.id}`} className="highlight-item">
                  <span>{story.category}</span>
                  <strong>{story.title}</strong>
                  <small>Por {story.author_name}</small>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="participation-panel mb-8">
          <h2 className="participation-title">Como participar do mural</h2>
          <p className="participation-copy">Este é um mural eclético: não pertence a nenhuma categoria ou grupo específico. Qualquer pessoa pode compartilhar sua história, do jeito e sobre o assunto que quiser.</p>
          <p className="participation-copy mt-2">Leitura e reações são abertas a todos. Para enviar uma história nova, é preciso entrar com sua conta.</p>
          <ul className="participation-list">
            <li>Escolha uma das categorias existentes ou sugira uma nova ao enviar sua história — o mural está sempre aberto a crescer.</li>
            <li>Reaja por emojis ou acrescente um comentário para compartilhar seu ponto de vista.</li>
            <li>Para comentar, entre na sua conta. Todo comentário passa por moderação antes de ser publicado.</li>
            <li>Reações abusivas em sequência podem ser limitadas temporariamente.</li>
          </ul>
          <p className="participation-foot">Ao continuar, você concorda em usar o mural com respeito às memórias compartilhadas.</p>
          {reactionNotice && <p className="reaction-notice">{reactionNotice}</p>}
        </section>
        
        <div className="filter-panel mb-8">
          <div className="filter-heading">
            <div>
              <p className="filter-kicker">Busca e filtros</p>
              <h2 className="filter-title">Encontre uma história específica</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                Aqui você pode buscar uma história pelo título, pelo nome do autor ou pelo conteúdo. Também pode filtrar por categoria e por data de publicação.
              </p>
            </div>
            <span className="filter-hint">Escolha uma ou mais opções</span>
          </div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Busca geral</p>
          <input
            type="text"
            placeholder="Digite uma palavra, título ou nome de autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-input filter-search mb-4"
          />
          <div className="filter-grid">
            <input type="text" placeholder="Nome do autor" value={author} onChange={(e) => setAuthor(e.target.value)} className="filter-input" />
            <input type="text" placeholder="Título do causo" value={title} onChange={(e) => setTitle(e.target.value)} className="filter-input" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="filter-input">
              <option value="">Todas as categorias</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <label className="date-field">
              <span>De</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="filter-input" />
            </label>
            <label className="date-field">
              <span>Até</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="filter-input" />
            </label>
          </div>
          <p className="filter-result">{stories.length} {stories.length === 1 ? 'história encontrada' : 'histórias encontradas'}</p>
        </div>

        <section className="story-feed-area">
          <div className="story-feed-heading">
            <span>{categoryFromUrl ? `Categoria: ${categoryFromUrl}` : 'Histórias do mural'}</span>
            <span className="story-feed-line" />
          </div>
          {loading ? (
            <p className="text-center text-white">Carregando histórias...</p>
          ) : stories.length > 0 ? (
            <div>
              {stories.map(story => (
                <StoryCard
                  key={story.id}
                  story={story}
                  reactionData={reactionMap[story.id]}
                  reactionPending={reactionBusyMap[story.id]}
                  onToggleReaction={toggleReaction}
                  onVisible={registerStoryView}
                />
              ))}
            </div>
          ) : category ? (
            <p className="text-center text-white">Ainda não há histórias na categoria "{category}" até o momento. Seja a primeira pessoa a compartilhar uma!</p>
          ) : (
            <p className="text-center text-white">Nenhuma história encontrada.</p>
          )}
        </section>
      </div>
    </div>
  )
}
