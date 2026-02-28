// ═══════════════════════════════════════════════════════════════════════════════
// Admin Navigation Bar
// ═══════════════════════════════════════════════════════════════════════════════
// Separate navbar for admin pages - shows only admin-relevant links.
// Admins have a focused management experience without customer features.
// ═══════════════════════════════════════════════════════════════════════════════

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminNavbar() {
  const { user: admin, logout } = useAuth()
  const location = useLocation()

  // Helper to check if link is active
  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(path)
  }

  const linkClass = (path) => `px-3 py-2 rounded ${
    isActive(path) 
      ? 'bg-gray-700 text-white' 
      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
  }`

  return (
    <nav className="bg-gray-900 text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Admin branding and navigation */}
          <div className="flex items-center space-x-4">
            <Link to="/admin" className="font-bold text-xl text-green-400">
              EV Cars Admin
            </Link>
            
            <div className="hidden md:flex items-center space-x-1 ml-6">
              <Link to="/admin" className={linkClass('/admin')}>
                Dashboard
              </Link>
              <Link to="/admin/analytics" className={linkClass('/admin/analytics')}>
                Analytics
              </Link>
              <Link to="/admin/leads" className={linkClass('/admin/leads')}>
                Leads
              </Link>
              <Link to="/admin/appointments" className={linkClass('/admin/appointments')}>
                Appointments
              </Link>
            </div>
          </div>
          
          {/* Right side - Admin info and logout */}
          <div className="flex items-center space-x-4">
            {admin && (
              <>
                <span className="text-gray-400 text-sm">
                  Logged in as <span className="text-white font-medium">{admin.username}</span>
                </span>
                <button 
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm"
                >
                  Logout
                </button>
              </>
            )}
            <Link 
              to="/" 
              className="text-gray-400 hover:text-white text-sm border border-gray-600 px-3 py-1.5 rounded"
            >
              View Customer Site →
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
