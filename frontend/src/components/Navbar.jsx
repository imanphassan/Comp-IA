// ═══════════════════════════════════════════════════════════════════════════════
// Customer Navigation Bar
// ═══════════════════════════════════════════════════════════════════════════════
// Navigation for the customer-facing site. Shows:
//   - Guests: Browse, Map, Chatbot, Login/Register
//   - Customers: Browse, Map, Chatbot, My Garage, Account info
//
// Admin access is via a separate route (/admin/login) with its own navbar.
// ═══════════════════════════════════════════════════════════════════════════════

import { Link } from 'react-router-dom'
import { useCustomerAuth } from '../context/CustomerAuthContext'

export default function Navbar() {
  // Customer auth (for customer features)
  const { customer, logout: customerLogout } = useCustomerAuth()

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex items-center justify-between">
        {/* Left side - Main navigation */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="font-bold text-xl">EV Cars</Link>
          <Link to="/" className="hover:text-gray-300">Browse</Link>
          <Link to="/map" className="hover:text-gray-300">Map</Link>
          <Link to="/chatbot" className="hover:text-gray-300">Chatbot</Link>
          <Link to="/garage" className="hover:text-gray-300">My Garage</Link>
        </div>
        
        {/* Right side - Customer auth section */}
        <div className="flex items-center space-x-4">
          {customer ? (
            <>
              <span className="text-gray-300 text-sm">
                Hi, {customer.name.split(' ')[0]}
              </span>
              <button 
                onClick={customerLogout} 
                className="hover:text-gray-300 text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-gray-300">Login</Link>
              <Link 
                to="/register" 
                className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
