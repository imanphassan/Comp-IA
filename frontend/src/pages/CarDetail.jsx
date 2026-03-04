// ═══════════════════════════════════════════════════════════════════════════════
// Car Detail Page
// ═══════════════════════════════════════════════════════════════════════════════
// Shows full information for a single car with action buttons:
//   - Show Interest (Feature 2: Lead Management)
//   - Book Test Drive (Feature 3: Appointment Scheduling)
//   - Add to Garage (Feature 4: My Garage)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import InterestForm from '../components/InterestForm'
import BookingForm from '../components/BookingForm'
import { useCustomerAuth } from '../context/CustomerAuthContext'

export default function CarDetail() {
  const { carId } = useParams()  // Get car ID from URL
  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modal states
  const [showInterestForm, setShowInterestForm] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  
  // Garage state
  const [inGarage, setInGarage] = useState(false)
  
  // Customer auth for garage functionality
  const { isAuthenticated, getToken } = useCustomerAuth()

  // Fetch car details on mount
  useEffect(() => {
    api.get(`/cars/${carId}`)
      .then((res) => setCar(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Car not found'))
      .finally(() => setLoading(false))
  }, [carId])
  
  // Check if car is in garage on mount (only for authenticated users)
  useEffect(() => {
    const checkGarage = async () => {
      // Get token directly from localStorage to avoid stale closure
      const token = localStorage.getItem('customerToken')
      if (!isAuthenticated || !token) {
        setInGarage(false)
        return
      }
      
      try {
        const res = await api.get('/customer/garage', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const savedCarIds = res.data.map(s => s.car_id)
        setInGarage(savedCarIds.includes(carId))
      } catch (err) {
        console.error('Failed to check garage:', err)
        setInGarage(false)
      }
    }
    
    checkGarage()
  }, [carId, isAuthenticated])
  
  // ─────────────────────────────────────────────────────────────────────────
  // GARAGE FUNCTIONS (Feature 4) - Requires authentication
  // ─────────────────────────────────────────────────────────────────────────
  const toggleGarage = async () => {
    // Get token directly from localStorage to avoid stale closure
    const token = localStorage.getItem('customerToken')
    if (!isAuthenticated || !token) return
    
    try {
      if (inGarage) {
        await api.delete(`/customer/garage/${carId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setInGarage(false)
      } else {
        await api.post(`/customer/garage/${carId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setInGarage(true)
      }
    } catch (err) {
      console.error('Failed to toggle garage:', err)
    }
  }

  if (loading) {
    return <p className="text-center py-8">Loading...</p>
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/listings" className="text-green-600 hover:underline">Back to listings</Link>
      </div>
    )
  }

  // Get proper image URL
  const imageUrl = car.image_url.startsWith('/api') 
    ? `http://localhost:5001${car.image_url}` 
    : car.image_url

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-3xl mx-auto">
      {/* Interest Form Modal */}
      {showInterestForm && (
        <InterestForm
          carId={car.car_id}
          carModel={car.model}
          onClose={() => setShowInterestForm(false)}
        />
      )}
      
      {/* Booking Form Modal */}
      {showBookingForm && (
        <BookingForm
          carId={car.car_id}
          carModel={car.model}
          onClose={() => setShowBookingForm(false)}
        />
      )}
      
      {/* Car Image */}
      <div className="relative">
        <img
          src={imageUrl}
          alt={car.model}
          className="w-full h-64 object-cover"
        />
        {/* Sold Badge */}
        {car.status === 'sold' && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg font-bold">
            SOLD
          </div>
        )}
      </div>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-2">{car.model}</h1>
        <p className="text-gray-600 mb-4">{car.year}</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-500">Price</p>
            <p className="text-xl font-bold text-green-600">AED {car.price.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-500">Range</p>
            <p className="text-xl font-bold">{car.range_km} km</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-500">Charge Time</p>
            <p className="text-xl font-bold">{car.charge_time_min} min</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-2">Description</h2>
        <p className="text-gray-700">{car.description}</p>

        {/* Action Buttons - Only show for available cars */}
        {car.status !== 'sold' && (
          <div className="mt-6">
            {/* Show login prompt if not authenticated */}
            {!isAuthenticated ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 mb-3">
                  <strong>Want to save this car or book a test drive?</strong>
                </p>
                <p className="text-blue-600 text-sm mb-3">
                  Login or create an account to show interest, book test drives, and save cars to your garage.
                </p>
                <div className="flex gap-3">
                  <Link
                    to="/login"
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="border border-blue-600 text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-50 font-medium"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {/* Show Interest Button (Feature 2) */}
                <button
                  onClick={() => setShowInterestForm(true)}
                  className="flex-1 min-w-[150px] bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Show Interest
                </button>
                
                {/* Book Test Drive Button (Feature 3) */}
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="flex-1 min-w-[150px] bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-medium"
                >
                  Book Test Drive
                </button>
                
                {/* Add to Garage Button (Feature 4) */}
                <button
                  onClick={toggleGarage}
                  className={`flex-1 min-w-[150px] py-3 px-6 rounded-lg font-medium border-2 ${
                    inGarage
                      ? 'bg-orange-100 border-orange-500 text-orange-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {inGarage ? '✓ In My Garage' : 'Add to Garage'}
                </button>
              </div>
            )}
          </div>
        )}

        <Link
          to="/listings"
          className="inline-block mt-6 text-green-600 hover:underline"
        >
          ← Back to listings
        </Link>
      </div>
    </div>
  )
}
