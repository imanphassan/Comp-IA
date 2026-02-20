// Car detail page showing full information for a single car
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'

export default function CarDetail() {
  const { carId } = useParams()  // Get car ID from URL
  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch car details on mount
  useEffect(() => {
    api.get(`/cars/${carId}`)
      .then((res) => setCar(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Car not found'))
      .finally(() => setLoading(false))
  }, [carId])

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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-3xl mx-auto">
      <img
        src={car.image_url}
        alt={car.model}
        className="w-full h-64 object-cover"
      />
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
