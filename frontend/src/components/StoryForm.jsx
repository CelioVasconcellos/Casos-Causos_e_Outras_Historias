import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutos
const STALL_WARNING_MS = 15 * 1000 // avisa apos 15s sem progresso

export default function StoryForm({ onSuccess, storyToEdit = null }) {
  const [formData, setFormData] = useState({
    title: '',
    author_name: localStorage.getItem('username') || '',
    category: 'Geral',
    story_text: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordingError, setRecordingError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [slowConnection, setSlowConnection] = useState(false)
  const lastProgressRef = useRef({ percent: 0, time: 0 })
  const stallTimerRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  useEffect(() => () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current)
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
  }, [audioPreviewUrl])

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

  const startRecording = async () => {
    setRecordingError('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('Seu navegador não permite gravação de áudio. Escolha um arquivo de áudio para enviar.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recordingChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const audioBlob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const extension = audioBlob.type.includes('mp4') ? 'm4a' : 'webm'
        const recordedFile = new File([audioBlob], `relato-gravado.${extension}`, { type: audioBlob.type })
        setMediaFile(recordedFile)
        setAudioPreviewUrl(URL.createObjectURL(recordedFile))
        stream.getTracks().forEach(track => track.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecordingSeconds(0)
      setRecording(true)
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds(seconds => seconds + 1), 1000)
    } catch (error) {
      setRecordingError('Não foi possível acessar o microfone. Autorize o uso do microfone e tente novamente.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = null
    setRecording(false)
  }

  const removeMedia = () => {
    setMediaFile(null)
    setAudioPreviewUrl('')
    setRecordingError('')
  }

  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0')
    return `${minutes}:${remainingSeconds}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!mediaFile && formData.story_text.trim().length < 10) {
      setMessage('Escreva pelo menos 10 caracteres ou anexe um áudio.')
      return
    }
    setLoading(true)
    setMessage('')
    setUploadProgress(0)
    setIsProcessing(false)
    setSlowConnection(false)
    lastProgressRef.current = { percent: 0, time: Date.now() }

    // Watchdog: se ficar 15s sem nenhum progresso, avisa que a conexao esta lenta
    stallTimerRef.current = window.setInterval(() => {
      const { time } = lastProgressRef.current
      if (Date.now() - time > STALL_WARNING_MS) setSlowConnection(true)
    }, 1000)

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token')
      const payload = new FormData()
      Object.entries(formData).forEach(([key, value]) => payload.append(key, value))
      if (mediaFile) payload.append('media', mediaFile)

      const endpoint = storyToEdit ? `/api/stories/${storyToEdit.id}` : '/api/stories'
      const method = storyToEdit ? 'put' : 'post'
      await axios[method](endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: UPLOAD_TIMEOUT_MS,
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          if (percent !== lastProgressRef.current.percent) {
            lastProgressRef.current = { percent, time: Date.now() }
            setSlowConnection(false)
          }
          setUploadProgress(percent)
          if (percent >= 100) setIsProcessing(true)
        }
      })
      setMessage('Obrigado! Seu relato foi enviado para curadoria.')
      setFormData({ title: '', author_name: localStorage.getItem('username') || '', category: 'Geral', story_text: '' })
      setMediaFile(null)
      setAudioPreviewUrl('')
      setRecordingSeconds(0)
      setRecordingError('')
      setUploadProgress(0)
      setIsProcessing(false)
      e.target.reset()
      if (onSuccess) onSuccess()
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        setMessage('O envio demorou demais e foi cancelado. Verifique sua internet, reduza o tamanho do arquivo e tente novamente.')
      } else {
        setMessage('Erro ao enviar. Tente novamente.')
      }
      setUploadProgress(0)
      setIsProcessing(false)
    } finally {
      if (stallTimerRef.current) window.clearInterval(stallTimerRef.current)
      setSlowConnection(false)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Compartilhe Sua História</h2>
      
      <input
        type="text"
        name="author_name"
        placeholder="Nome que assina a história"
        value={formData.author_name}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="-mt-3 mb-4 text-xs text-gray-500">
        Preenchido com seu usuário. Você pode alterar se preferir assinar de outra forma.
      </p>
      
      <input
        type="text"
        name="title"
        placeholder="Título da história (opcional para áudio)"
        value={formData.title}
        onChange={handleChange}
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
        placeholder="Conte sua história ou envie somente um áudio..."
        value={formData.story_text}
        onChange={handleChange}
        rows="8"
        className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <label className="block mb-4">
        <span className="block mb-2 text-sm font-semibold text-gray-700">Foto, vídeo ou áudio (opcional)</span>
        <input
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp3,audio/mp4,audio/m4a,audio/wav,audio/ogg,audio/webm,audio/aac"
          onChange={(e) => setMediaFile(e.target.files[0] || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
        />
        <span className="block mt-1 text-xs text-gray-500">Imagens até 5 MB; vídeos e áudios até 50 MB. Você pode enviar só um áudio.</span>
      </label>

      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="mb-2 text-sm font-semibold text-blue-900">Ou grave sua história agora</p>
        <p className="mb-3 text-xs text-blue-800">Toque em gravar, conte sua história e pare quando terminar. Depois, o áudio será enviado pelo botão abaixo.</p>
        <div className="flex flex-wrap items-center gap-3">
          {!recording ? (
            <button type="button" onClick={startRecording} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400">
              Gravar áudio
            </button>
          ) : (
            <button type="button" onClick={stopRecording} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700">
              Parar gravação
            </button>
          )}
          {recording && <span className="font-mono text-sm font-semibold text-red-700">Gravando {formatRecordingTime(recordingSeconds)}</span>}
        </div>
        {mediaFile && !recording && mediaFile.type.startsWith('audio/') && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-blue-900">Prévia do áudio</p>
            <audio src={audioPreviewUrl} controls className="w-full" />
            <button type="button" onClick={removeMedia} disabled={loading} className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
              Excluir áudio
            </button>
          </div>
        )}
        {recordingError && <p className="mt-3 text-sm font-semibold text-red-700">{recordingError}</p>}
      </div>
      
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
          {slowConnection && !isProcessing && (
            <p className="mt-2 text-xs font-semibold text-amber-600">
              A conexão está lenta, mas o envio continua. Aguarde — se demorar mais de 10 minutos, cancelaremos com aviso.
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
