// ═══════════════════════════════════════════════════════════════════════════════
// My Garage Page (Feature 4: Saved Cars)
// ═══════════════════════════════════════════════════════════════════════════════
// Displays cars that the logged-in customer has saved to their garage.
// Requires authentication - guests are prompted to login/register.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useCustomerAuth } from '../context/CustomerAuthContext'

export default function MyGarage() {
  // ─────────────────────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Customer auth - requires login
  const { customer, getToken, isAuthenticated, loading: authLoading } = useCustomerAuth()

  // ─────────────────────────────────────────────────────────────────────────
  // DATA FETCHING - Only for authenticated users
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSavedCars = async () => {
      // Get token directly from localStorage to avoid stale closure
      const token = localStorage.getItem('customerToken')
      if (!isAuthenticated || !token) {
        setLoading(false)
        return
      }
      
      try {
        const res = await api.get('/customer/garage', {
          headers: { Authorization: `Bearer ${token}` }
        })
        // Extract car objects from saved car records
        const savedCars = res.data.map(saved => saved.car).filter(Boolean)
        setCars(savedCars)
      } catch (err) {
        setError('Failed to load saved cars')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchSavedCars()
    }
  }, [isAuthenticated, authLoading])

  // ─────────────────────────────────────────────────────────────────────────
  // REMOVE FROM GARAGE - Requires authentication
  // ─────────────────────────────────────────────────────────────────────────
  const removeFromGarage = async (carId) => {
    const token = localStorage.getItem('customerToken')
    if (!isAuthenticated || !token) return
    
    try {
      await api.delete(`/customer/garage/${carId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCars(cars.filter(car => car.car_id !== carId))
    } catch (err) {
      console.error('Failed to remove car:', err)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CLEAR ALL - Requires authentication
  // ─────────────────────────────────────────────────────────────────────────
  const clearGarage = async () => {
    const token = localStorage.getItem('customerToken')
    if (!isAuthenticated || !token) return
    if (!window.confirm('Remove all cars from your garage?')) return
    
    try {
      for (const car of cars) {
        await api.delete(`/customer/garage/${car.car_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setCars([])
    } catch (err) {
      console.error('Failed to clear garage:', err)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-4">🚗</div>
          <h1 className="text-2xl font-bold mb-4">My Garage</h1>
          <p className="text-gray-600 mb-6">
            Login or create an account to save cars to your garage and access them from any device.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/login"
              className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 font-medium"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="border border-blue-600 text-blue-600 py-2 px-6 rounded-lg hover:bg-blue-50 font-medium"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Garage</h1>
          <p className="text-gray-600 mt-1">
            Cars you've saved to your account, {customer?.name?.split(' ')[0]}.
          </p>
        </div>
        {cars.length > 0 && (
          <button
            onClick={clearGarage}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Clear All
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Empty State */}
      {cars.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🚗</div>
          <h2 className="text-xl font-semibold mb-2">Your garage is empty</h2>
          <p className="text-gray-600 mb-6">
            Save cars you're interested in by clicking "Add to Garage" on any listing.
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Browse Cars
          </Link>
        </div>
      ) : (
        <>
          {/* Car Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cars.map((car) => (
              <div key={car.car_id} className="bg-white rounded-lg shadow overflow-hidden">
                <Link to={`/cars/${car.car_id}`}>
                  <img
                    src={car.image_url.startsWith('/api') ? `http://localhost:5001${car.image_url}` : car.image_url}
                    alt={car.model}
                    className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                  />
                </Link>
                <div className="p-4">
                  <Link to={`/cars/${car.car_id}`}>
                    <h3 className="text-lg font-semibold hover:text-blue-600">
                      {car.model}
                    </h3>
                  </Link>
                  <div className="text-2xl font-bold text-green-600 mt-1">
                    AED {car.price.toLocaleString()}
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600 mt-2">
                    <span>{car.year}</span>
                    <span>{car.range_km} km range</span>
                  </div>
                  
                  {/* Status Badge */}
                  {car.status === 'sold' && (
                    <div className="mt-2">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                        SOLD
                      </span>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <Link
                      to={`/cars/${car.car_id}`}
                      className="flex-1 text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => removeFromGarage(car.car_id)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 text-sm text-gray-500">
            {cars.length} car{cars.length !== 1 ? 's' : ''} in your garage
          </div>
        </>
      )}
    </div>
  )
}
