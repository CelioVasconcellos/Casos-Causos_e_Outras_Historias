import { useState, useEffect } from 'react'
import axios from 'axios'

export default function StoryForm({ onSuccess, storyToEdit = null }) {
  const [formData, setFormData] = useState({
    title: '',
    author_name: '',
    category: 'Geral',
    story_text: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (storyToEdit) {
      setFormData({
        title: storyToEdit.title,
        author_name: storyToEdit.author_name,
        category: storyToEdit.category,
        story_text: storyToEdit.story_text,
      })
    }
  }, [storyToEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setUploadProgress(0)
    setIsProcessing(false)
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token')
      const payload = new FormData()
      Object.entries(formData).forEach(([key, value]) => payload.append(key, value))
      if (mediaFile) payload.append('media', mediaFile)

      const endpoint = storyToEdit ? `/api/stories/${storyToEdit.id}` : '/api/stories'
      const method = storyToEdit ? 'put' : 'post'
      await axios[method](endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percent)
          if (percent >= 100) setIsProcessing(true)
        }
      })
      setMessage('Obrigado! Seu relato foi enviado para curadoria.')
      setFormData({ title: '', author_name: '', category: 'Geral', story_text: '' })
      setMediaFile(null)
      setUploadProgress(0)
      setIsProcessing(false)
      e.target.reset()
      if (onSuccess) onSuccess()
    } catch (error) {
      setMessage('Erro ao enviar. Tente novamente.')
      setUploadProgress(0)
      setIsProcessing(false)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Compartilhe Sua História</h2>
      
      <input
        type="text"
        name="author_name"
        placeholder="Seu nome"
        value={formData.author_name}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <input
        type="text"
        name="title"
        placeholder="Título da história"
        value={formData.title}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <select
        name="category"
        value={formData.category}
        onChange={handleChange}
        className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option>Geral</option>
        <option>Espirituais</option>
        <option>Festas & Celebrações</option>
        <option>Aprendizados</option>
        <option>Relacionamentos</option>
        <option>Vida & Viagens</option>
      </select>
      
      <textarea
        name="story_text"
        placeholder="Conte sua história..."
        value={formData.story_text}
        onChange={handleChange}
        required
        rows="8"
        className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <label className="block mb-4">
        <span className="block mb-2 text-sm font-semibold text-gray-700">Foto ou vídeo (opcional)</span>
        <input
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          onChange={(e) => setMediaFile(e.target.files[0] || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
        />
        <span className="block mt-1 text-xs text-gray-500">Imagens até 5 MB; vídeos até 50 MB.</span>
      </label>
      
      {loading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>
              {isProcessing
                ? 'Upload concluído. Processando no servidor...'
                : mediaFile
                  ? `Enviando${mediaFile.type.startsWith('video') ? ' vídeo' : ' imagem'}... ${uploadProgress}%`
                  : 'Enviando relato...'}
            </span>
            {!isProcessing && mediaFile && <span>{uploadProgress}%</span>}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            {isProcessing ? (
              <div className="h-3 bg-blue-500 rounded-full animate-pulse w-full"></div>
            ) : (
              <div
                className="h-3 bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            )}
          </div>
          {mediaFile && mediaFile.size > 20 * 1024 * 1024 && !isProcessing && (
            <p className="mt-2 text-xs text-gray-500">
              Arquivo grande: o envio pode levar alguns minutos dependendo da sua internet. Não feche esta página.
            </p>
          )}
        </div>
      )}
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading
          ? isProcessing
            ? 'Processando...'
            : mediaFile
              ? `Enviando... ${uploadProgress}%`
              : 'Enviando...'
          : 'Enviar Relato'}
      </button>
      
      {message && <p className="mt-4 text-center text-green-600">{message}</p>}
    </form>
  )
}
