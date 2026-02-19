import { useState } from 'react'
import api from '../api'

export default function Chatbot() {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState([])
  const [loading, setLoading] = useState(false)

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
      <h1 className="text-3xl font-bold mb-6">EV Assistant</h1>

      <div className="bg-white rounded-lg shadow-md p-4 mb-4 h-96 overflow-y-auto">
        {conversation.length === 0 ? (
          <p className="text-gray-500 text-center mt-32">
            Ask me about EV range, charging, battery health, or pricing!
          </p>
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
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </p>
                <p>{msg.text}</p>
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
          placeholder="Type your question..."
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
