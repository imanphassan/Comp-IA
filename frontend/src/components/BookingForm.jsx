// ═══════════════════════════════════════════════════════════════════════════════
// Booking Form Component (Feature 3: Appointment Scheduling)
// ═══════════════════════════════════════════════════════════════════════════════
// A modal form for booking test drive appointments.
// Shows available time slots for the selected date and prevents double-booking.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import api from '../api'
import { useCustomerAuth } from '../context/CustomerAuthContext'

export default function BookingForm({ carId, carModel, onClose, onSuccess }) {
  const { customer } = useCustomerAuth()
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    date: '',
    time: '',
  })
  
  // Auto-fill customer data when component mounts
  useEffect(() => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_name: customer.name || '',
        customer_email: customer.email || ''
      }))
    }
  }, [customer])
  const [availableSlots, setAvailableSlots] = useState([])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [success, setSuccess] = useState(false)

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // Get maximum date (30 days from now)
  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    return maxDate.toISOString().split('T')[0]
  }

  // Fetch available slots when date changes
  useEffect(() => {
    if (formData.date) {
      fetchAvailableSlots(formData.date)
    } else {
      setAvailableSlots([])
    }
  }, [formData.date])

  const fetchAvailableSlots = async (date) => {
    setLoadingSlots(true)
    try {
      const res = await api.get(`/appointments/available-slots?date=${date}`)
      setAvailableSlots(res.data)
      // Clear selected time if it's no longer available
      if (!res.data.includes(formData.time)) {
        setFormData(prev => ({ ...prev, time: '' }))
      }
    } catch (err) {
      console.error('Failed to fetch slots:', err)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const formatTime = (timeStr) => {
    const [hours] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:00 ${ampm}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      await api.post('/appointments', {
        ...formData,
        car_id: carId,
      })
      setSuccess(true)
      if (onSuccess) onSuccess()
      setTimeout(() => {
        onClose()
      }, 3000)
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors)
      } else if (err.response?.data?.error) {
        setErrors({ general: err.response.data.error })
      } else {
        setErrors({ general: 'Failed to book appointment. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-green-600 mb-2">Appointment Booked!</h3>
            <p className="text-gray-600">
              Your test drive for the {carModel} has been scheduled for{' '}
              <strong>{new Date(formData.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}</strong> at <strong>{formatTime(formData.time)}</strong>.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              We'll send a confirmation to {formData.customer_email}
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Book a Test Drive</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Schedule a test drive for the <strong>{carModel}</strong>.
            </p>

            {errors.general && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-3 py-2 ${
                    errors.customer_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                />
                {errors.customer_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.customer_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-3 py-2 ${
                    errors.customer_email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
                />
                {errors.customer_email && (
                  <p className="text-red-500 text-sm mt-1">{errors.customer_email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="+971 50 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className={`w-full border rounded-lg px-3 py-2 ${
                    errors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.date && (
                  <p className="text-red-500 text-sm mt-1">{errors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Time *
                </label>
                {loadingSlots ? (
                  <div className="text-gray-500 text-sm py-2">Loading available times...</div>
                ) : !formData.date ? (
                  <div className="text-gray-500 text-sm py-2">Select a date first</div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-orange-600 text-sm py-2">
                    No available slots for this date. Please select another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, time: slot }))}
                        className={`py-2 px-3 rounded text-sm ${
                          formData.time === slot
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
                {errors.time && (
                  <p className="text-red-500 text-sm mt-1">{errors.time}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.time}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
