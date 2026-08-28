import { useEffect, useState } from 'react'
import axios from 'axios'

const statusLabels = {
  pending: 'Pendentes',
  needs_revision: 'Correções',
  approved: 'Aprovados',
  deleted: 'Excluídos',
}

export default function AdminComments() {
  const [comments, setComments] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchComments = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const token = localStorage.getItem('admin_token')
      const { data } = await axios.get('/api/admin/comments', {
        params: { status_filter: filter },
        headers: { Authorization: `Bearer ${token}` },
      })
      setComments(data)
    } catch (error) {
      console.error('Erro ao buscar comentários')
      setComments([])
      setErrorMessage(error.response?.data?.detail || `Não foi possível carregar os comentários (${error.response?.status || 'erro de conexão'}).`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchComments() }, [filter])

  const updateComment = async (id, payload) => {
    try {
      const token = localStorage.getItem('admin_token')
      await axios.put(`/api/admin/comments/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchComments()
    } catch (error) {
      console.error('Erro ao atualizar comentário')
    }
  }

  const deleteComment = async (comment) => {
    const reason = window.prompt('Explique o motivo da exclusão do comentário:')
    if (reason === null) return
    try {
      const token = localStorage.getItem('admin_token')
      await axios.delete(`/api/admin/comments/${comment.id}`, {
        params: { reason: reason.trim() || undefined },
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchComments()
    } catch (error) {
      console.error('Erro ao excluir comentário')
    }
  }

  const restoreComment = async (id) => {
    try {
      const token = localStorage.getItem('admin_token')
      await axios.post(`/api/admin/comments/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchComments()
    } catch (error) {
      console.error('Erro ao restaurar comentário')
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(statusLabels).map(([value, label]) => (
          <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-4 py-2 font-semibold ${filter === value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>
      {errorMessage && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
      {loading ? <p>Carregando...</p> : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-lg bg-white p-4 shadow-md">
              <p className="mb-2 text-sm text-gray-600">História #{comment.story_id} · {comment.author_name} · {new Date(comment.created_at).toLocaleDateString('pt-BR')}</p>
              <p className="mb-4 whitespace-pre-line text-gray-700">{comment.comment_text}</p>
              {comment.moderation_note && <p className="mb-4 rounded bg-yellow-50 p-3 text-sm text-yellow-800">Mensagem de moderação: {comment.moderation_note}</p>}
              {filter === 'pending' && <button onClick={() => updateComment(comment.id, { status: 'approved' })} className="mr-2 rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700">Publicar</button>}
              {filter !== 'deleted' && <>
                {filter === 'pending' && <button onClick={() => { const note = window.prompt('Explique ao autor o que precisa ser corrigido:'); if (note?.trim()) updateComment(comment.id, { status: 'needs_revision', moderation_note: note.trim() }) }} className="mr-2 rounded bg-yellow-500 px-3 py-1 text-white hover:bg-yellow-600">Solicitar correção</button>}
                <button onClick={() => deleteComment(comment)} className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700">Excluir</button>
              </>}
              {filter === 'deleted' && <button onClick={() => restoreComment(comment.id)} className="rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700">Restaurar</button>}
            </article>
          ))}
          {comments.length === 0 && <p>Nenhum comentário nesta fila.</p>}
        </div>
      )}
    </section>
  )
}