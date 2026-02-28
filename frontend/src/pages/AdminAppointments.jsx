// ═══════════════════════════════════════════════════════════════════════════════
// Admin Appointments Page (Feature 3: Appointment Scheduling)
// ═══════════════════════════════════════════════════════════════════════════════
// This page displays all scheduled appointments for the admin.
// Appointments are created when customers book test drives.
//
// Features:
//   - View all appointments sorted by date/time
//   - See customer details and which car they want to test drive
//   - Mark appointments as completed or cancelled
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal state for car preview
  const [carModal, setCarModal] = useState({ open: false, car: null, loading: false })

  // Fetch appointments on mount
  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments')
      setAppointments(res.data)
    } catch (err) {
      setError('Failed to load appointments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Update appointment status
  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const res = await api.put(`/appointments/${appointmentId}/status`, { status: newStatus })
      setAppointments(appointments.map(apt => 
        apt.appointment_id === appointmentId ? res.data : apt
      ))
    } catch (err) {
      alert('Failed to update appointment')
      console.error(err)
    }
  }

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A'
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Open car preview modal
  const openCarModal = async (carId) => {
    setCarModal({ open: true, car: null, loading: true })
    try {
      const res = await api.get(`/cars/${carId}`)
      setCarModal({ open: true, car: res.data, loading: false })
    } catch (err) {
      console.error('Failed to load car:', err)
      setCarModal({ open: false, car: null, loading: false })
    }
  }

  // Close car preview modal
  const closeCarModal = () => {
    setCarModal({ open: false, car: null, loading: false })
  }

  // Get proper image URL
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return ''
    return imageUrl.startsWith('/api') 
      ? `http://localhost:5001${imageUrl}` 
      : imageUrl
  }

  // Check if appointment is in the past
  const isPast = (dateStr, timeStr) => {
    const appointmentDateTime = new Date(`${dateStr}T${timeStr}`)
    return appointmentDateTime < new Date()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading appointments...</div>
      </div>
    )
  }

  // Separate upcoming and past appointments
  const upcomingAppointments = appointments.filter(apt => 
    apt.status === 'scheduled' && !isPast(apt.appointment_date, apt.appointment_time)
  )
  const otherAppointments = appointments.filter(apt => 
    apt.status !== 'scheduled' || isPast(apt.appointment_date, apt.appointment_time)
  )

  return (
    <div>
      {/* Car Preview Modal */}
      {carModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 overflow-hidden">
            {carModal.loading ? (
              <div className="p-8 text-center text-gray-500">Loading car details...</div>
            ) : carModal.car ? (
              <>
                <img
                  src={getImageUrl(carModal.car.image_url)}
                  alt={carModal.car.model}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{carModal.car.model}</h3>
                  <p className="text-gray-600 mb-4">{carModal.car.year}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="font-bold text-green-600">AED {carModal.car.price?.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-500">Range</p>
                      <p className="font-bold">{carModal.car.range_km} km</p>
                    </div>
                  </div>
                  
                  {carModal.car.status === 'sold' && (
                    <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-4 text-sm font-medium">
                      This car has been sold
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-4">{carModal.car.description}</p>
                  
                  <button
                    onClick={closeCarModal}
                    className="w-full bg-gray-800 text-white py-2 rounded hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-red-500">Failed to load car details</div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Appointments</h1>
        <Link
          to="/admin"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Upcoming Appointments */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
        {upcomingAppointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No upcoming appointments.
          </div>
        ) : (
          <div className="grid gap-4">
            {upcomingAppointments.map((apt) => (
              <div key={apt.appointment_id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-semibold">{apt.customer_name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">Email:</span>{' '}
                        <a href={`mailto:${apt.customer_email}`} className="text-blue-600 hover:underline">
                          {apt.customer_email}
                        </a>
                      </div>
                      {apt.customer_phone && (
                        <div>
                          <span className="font-medium">Phone:</span> {apt.customer_phone}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Car:</span>{' '}
                        <button 
                          onClick={() => openCarModal(apt.car_id)} 
                          className="text-blue-600 hover:underline"
                        >
                          {apt.car_model || `Car #${apt.car_id}`}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-blue-600">
                      {formatDate(apt.appointment_date)}
                    </div>
                    <div className="text-2xl font-bold">
                      {formatTime(apt.appointment_time)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                    onClick={() => handleStatusChange(apt.appointment_id, 'completed')}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Mark Completed
                  </button>
                  <button
                    onClick={() => handleStatusChange(apt.appointment_id, 'cancelled')}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past/Other Appointments */}
      {otherAppointments.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Past & Other Appointments</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Car</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {otherAppointments.map((apt) => (
                  <tr key={apt.appointment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{apt.customer_name}</div>
                      <div className="text-sm text-gray-500">{apt.customer_email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button 
                        onClick={() => openCarModal(apt.car_id)} 
                        className="text-blue-600 hover:underline"
                      >
                        {apt.car_model || `Car #${apt.car_id}`}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {formatDate(apt.appointment_date)} at {formatTime(apt.appointment_time)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-500">
        Total appointments: {appointments.length} | Upcoming: {upcomingAppointments.length}
      </div>
    </div>
  )
}
