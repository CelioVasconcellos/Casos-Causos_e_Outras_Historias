import StoryForm from '../components/StoryForm'

export default function Submit() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-2 text-center text-gray-900">Compartilhe Sua História</h1>
        <p className="text-center text-gray-600 mb-8">Sua narrativa importa para nossa comunidade</p>
        <StoryForm />
      </div>
    </div>
  )
}
