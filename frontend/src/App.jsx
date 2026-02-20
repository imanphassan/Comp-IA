import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import CarDetail from './pages/CarDetail'
import Map from './pages/Map'
import Chatbot from './pages/Chatbot'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import CarForm from './pages/CarForm'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Navigate to="/" replace />} />
          <Route path="/car/:carId" element={<CarDetail />} />
          <Route path="/map" element={<Map />} />
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/car/new" element={<CarForm />} />
          <Route path="/admin/car/:carId/edit" element={<CarForm />} />
        </Routes>
      </main>
    </div>
  )
}
