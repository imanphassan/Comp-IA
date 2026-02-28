// ═══════════════════════════════════════════════════════════════════════════════
// Admin Layout Component
// ═══════════════════════════════════════════════════════════════════════════════
// Wraps all admin pages with the admin-specific navbar and layout.
// Provides a completely separate experience from the customer site.
// ═══════════════════════════════════════════════════════════════════════════════

import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminNavbar from './AdminNavbar'

export default function AdminLayout({ children }) {
  const { user: admin, loading } = useAuth()

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Redirect to admin login if not authenticated
  if (!admin) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />
      <main className="container mx-auto p-4">
        {children}
      </main>
    </div>
  )
}
