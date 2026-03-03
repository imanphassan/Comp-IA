// ═══════════════════════════════════════════════════════════════════════════════
// Main App Component with Routing
// ═══════════════════════════════════════════════════════════════════════════════
// Two separate experiences:
//   1. Customer routes: Use customer Navbar with Browse, Map, Chatbot, etc.
//   2. Admin routes: Use AdminLayout with admin-only navigation
// ═══════════════════════════════════════════════════════════════════════════════

import { Routes, Route, Navigate } from 'react-router-dom'

// Layouts
import Navbar from './components/Navbar'
import AdminLayout from './components/AdminLayout'

// Customer Pages
import LandingPage from './pages/LandingPage'
import Home from './pages/Home'
import CarDetail from './pages/CarDetail'
import Map from './pages/Map'
import Chatbot from './pages/Chatbot'
import MyGarage from './pages/MyGarage'
import CustomerLogin from './pages/CustomerLogin'
import CustomerRegister from './pages/CustomerRegister'

// Admin Pages
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import CarForm from './pages/CarForm'
import Analytics from './pages/Analytics'
import AdminLeads from './pages/AdminLeads'
import AdminAppointments from './pages/AdminAppointments'

// ─────────────────────────────────────────────────────────────────────────────
// Customer Layout - wraps customer pages with customer navbar
// ─────────────────────────────────────────────────────────────────────────────
function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto p-4">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CUSTOMER ROUTES - with customer navbar */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Route path="/" element={<><Navbar /><LandingPage /></>} />
      <Route path="/browse" element={<CustomerLayout><Home /></CustomerLayout>} />
      <Route path="/listings" element={<Navigate to="/browse" replace />} />
      <Route path="/car/:carId" element={<CustomerLayout><CarDetail /></CustomerLayout>} />
      <Route path="/cars/:carId" element={<CustomerLayout><CarDetail /></CustomerLayout>} />
      <Route path="/map" element={<CustomerLayout><Map /></CustomerLayout>} />
      <Route path="/chatbot" element={<CustomerLayout><Chatbot /></CustomerLayout>} />
      <Route path="/garage" element={<CustomerLayout><MyGarage /></CustomerLayout>} />
      <Route path="/login" element={<CustomerLayout><CustomerLogin /></CustomerLayout>} />
      <Route path="/register" element={<CustomerLayout><CustomerRegister /></CustomerLayout>} />
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ADMIN ROUTES - with admin navbar (separate experience) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Admin login is standalone (no layout) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      
      {/* Protected admin routes with AdminLayout */}
      <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin/car/new" element={<AdminLayout><CarForm /></AdminLayout>} />
      <Route path="/admin/car/:carId/edit" element={<AdminLayout><CarForm /></AdminLayout>} />
      <Route path="/admin/analytics" element={<AdminLayout><Analytics /></AdminLayout>} />
      <Route path="/admin/leads" element={<AdminLayout><AdminLeads /></AdminLayout>} />
      <Route path="/admin/appointments" element={<AdminLayout><AdminAppointments /></AdminLayout>} />
    </Routes>
  )
}
