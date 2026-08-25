import { useState, useEffect } from 'react'
import axios from 'axios'
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

export default function Feed() {
  const [stories, setStories] = useState([])
  const [reactionMap, setReactionMap] = useState({})
  const [reactionBusyMap, setReactionBusyMap] = useState({})
  const [reactionNotice, setReactionNotice] = useState('')
  const [platformCounters, setPlatformCounters] = useState({
    unique_anonymous_visitors: 0,
    active_logged_users: 0,
    tracked_logged_users: 0,
    active_window_minutes: 15,
    visits_today: 0,
    visits_last_7_days: 0,
    visits_last_30_days: 0,
    daily_visits_last_7_days: [],
  })
  const [search, setSearch] = useState('')
  const [author, setAuthor] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStories()
    fetchCategories()
  }, [search, author, title, category, dateFrom, dateTo])

  useEffect(() => {
    const fetchCounters = async () => {
      try {
        const { data } = await axios.get('/api/stats/summary')
        setPlatformCounters(data)
      } catch (_ignored) {
        // Silencia falhas de telemetria para nao quebrar UX do mural.
      }
    }

    fetchCounters()
    const intervalId = window.setInterval(fetchCounters, 60 * 1000)
    return () => window.clearInterval(intervalId)
  }, [])

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
      setReactionMap({})
      return
    }

    try {
      const { data } = await axios.get('/api/stories/reactions/bulk', {
        params: { story_ids: realStories.map((story) => story.id) },
      })
      const nextMap = {}
      for (const item of data.items || []) {
        nextMap[item.story_id] = item
      }
      setReactionMap(nextMap)
    } catch (_ignored) {
      setReactionMap({})
    }
  }

  const toggleReaction = async (storyId, emoji) => {
    if (reactionBusyMap[storyId]) return

    setReactionNotice('')
    setReactionBusyMap((previous) => ({ ...previous, [storyId]: true }))
    try {
      const { data } = await axios.post(`/api/stories/${storyId}/reactions`, { emoji })
      setReactionMap((previous) => ({ ...previous, [storyId]: data }))
    } catch (error) {
      setReactionNotice(error.response?.data?.detail || 'Não foi possível registrar sua reação agora.')
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

  const formatDayLabel = (isoDate) => {
    if (!isoDate) return '--'
    const [year, month, day] = isoDate.split('-')
    return `${day}/${month}`
  }

  return (
    <div className="feed-page min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="feed-intro">
          <span className="feed-spark">um lugar para lembrar</span>
          <h1 className="feed-title text-4xl font-bold mb-2 text-center">Casos, Causos e Outras Histórias</h1>
          <p className="text-center mb-2">Memórias, aprendizados e testemunhos que fortalecem o cuidado coletivo.</p>
          <p className="text-center mb-8">Nosso objetivo é preservar histórias para inspirar as próximas gerações.</p>
        </div>

        <section className="participation-panel mb-8">
          <h2 className="participation-title">Como participar do mural</h2>
          <p className="participation-copy">Leitura e reações são abertas a todos. Para enviar uma história nova, é preciso entrar com sua conta.</p>
          <ul className="participation-list">
            <li>Reaja apenas por emojis para manter um ambiente respeitoso e acolhedor.</li>
            <li>Comentários em texto não estão disponíveis nesta fase.</li>
            <li>Reações abusivas em sequência podem ser limitadas temporariamente.</li>
          </ul>
          <p className="participation-foot">Ao continuar, você concorda em usar o mural com respeito às memórias compartilhadas.</p>
          <div className="platform-counters">
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
          </div>
          {reactionNotice && <p className="reaction-notice">{reactionNotice}</p>}
        </section>
        
        <div className="filter-panel mb-8">
          <div className="filter-heading">
            <div>
              <p className="filter-kicker">Encontre um causo</p>
              <h2 className="filter-title">Procure pela lembrança que ficou</h2>
            </div>
            <span className="filter-hint">Combine os filtros</span>
          </div>
          <input
            type="text"
            placeholder="Buscar em todas as histórias..."
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
            <span>Histórias do mural</span>
            <span className="story-feed-line" />
          </div>
          {loading ? (
            <p className="text-center text-gray-600">Carregando histórias...</p>
          ) : stories.length > 0 ? (
            <div>
              {stories.map(story => (
                <StoryCard
                  key={story.id}
                  story={story}
                  reactionData={reactionMap[story.id]}
                  reactionPending={reactionBusyMap[story.id]}
                  onToggleReaction={toggleReaction}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600">Nenhuma história encontrada.</p>
          )}
        </section>
      </div>
    </div>
  )
}
