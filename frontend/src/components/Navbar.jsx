import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/" className="font-bold text-xl">EV Cars</Link>
          <Link to="/" className="hover:text-gray-300">Browse</Link>
          <Link to="/map" className="hover:text-gray-300">Map</Link>
          <Link to="/chatbot" className="hover:text-gray-300">Chatbot</Link>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link to="/admin" className="hover:text-gray-300">Admin</Link>
              <button onClick={logout} className="hover:text-gray-300">Logout</button>
            </>
          ) : (
            <Link to="/admin/login" className="hover:text-gray-300">Admin Login</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
