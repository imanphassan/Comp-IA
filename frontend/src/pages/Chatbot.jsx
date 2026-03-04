// Chatbot page for EV car recommendations and questions
import { useState } from 'react'
import api from '../api'

export default function Chatbot() {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState([])  // Chat history
  const [loading, setLoading] = useState(false)

  // Send message to chatbot API
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    const userMessage = message.trim()
    setMessage('')
    setConversation((prev) => [...prev, { role: 'user', text: userMessage }])
    setLoading(true)

    try {
      const res = await api.post('/chatbot', { message: userMessage })
      setConversation((prev) => [...prev, { role: 'bot', text: res.data.reply }])
    } catch (err) {
      setConversation((prev) => [...prev, { role: 'bot', text: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">EV Car Advisor</h1>
        <p className="text-gray-600 mt-2">
          Get personalized car recommendations based on your budget, range, and charging needs
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-4 h-96 overflow-y-auto">
        {conversation.length === 0 ? (
          <div className="text-center mt-16">
            <p className="text-gray-600 mb-6">Try asking me something like:</p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setMessage('Recommend a car with budget 80000 AED')}
                className="mx-auto px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
              >
                "Recommend a car with budget 80,000 AED"
              </button>
              <button
                type="button"
                onClick={() => setMessage('Find me a car with 400 km range')}
                className="mx-auto px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                "Find me a car with 400 km range"
              </button>
              <button
                type="button"
                onClick={() => setMessage('I need a car that charges in 30 minutes')}
                className="mx-auto px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition"
              >
                "I need a car that charges in 30 minutes"
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              Or ask about range, charging, battery health, or pricing!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-green-100 ml-12'
                    : 'bg-gray-100 mr-12'
                }`}
              >
                <p className="text-sm font-medium text-gray-500 mb-1">
                  {msg.role === 'user' ? 'You' : 'EV Advisor'}
                </p>
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>
            ))}
            {loading && (
              <div className="bg-gray-100 mr-12 p-3 rounded-lg">
                <p className="text-gray-500">Typing...</p>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask for recommendations or EV advice..."
          className="flex-1 rounded border border-gray-300 p-3 focus:border-green-500 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
