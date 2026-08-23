export default function StoryCard({ story }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-bold text-gray-900">{story.title}</h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {story.category}
        </span>
      </div>
      
      <p className="text-sm text-gray-500 mb-3">
        Por <strong>{story.author_name}</strong> • {new Date(story.created_at).toLocaleDateString('pt-BR')}
      </p>
      
      {story.media_url && story.media_type === 'image' && (
        <img src={story.media_url} alt={story.title} className="w-full rounded-lg mb-3 max-h-96 object-cover" />
      )}
      
      {story.media_url && story.media_type === 'video' && (
        <video src={story.media_url} controls className="w-full rounded-lg mb-3 max-h-96" />
      )}
      
      <p className="text-gray-700 leading-relaxed">
        {story.story_text.length > 300 
          ? story.story_text.substring(0, 300) + '...' 
          : story.story_text
        }
      </p>
      
      {story.story_text.length > 300 && (
        <button className="mt-3 text-blue-600 font-semibold hover:text-blue-800">
          Ler mais
        </button>
      )}
    </div>
  )
}
