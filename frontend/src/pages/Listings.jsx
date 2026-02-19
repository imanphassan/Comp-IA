import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [budget, setBudget] = useState(searchParams.get('budget') || '')
  const [minRange, setMinRange] = useState(searchParams.get('min_range') || '')

  useEffect(() => {
    const params = {}
    if (budget) params.budget = budget
    if (minRange) params.min_range = minRange

    api.get('/cars', { params })
      .then((res) => setCars(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [searchParams])

  const handleFilter = (e) => {
    e.preventDefault()
    const params = {}
    if (budget) params.budget = budget
    if (minRange) params.min_range = minRange
    setSearchParams(params)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">All Listings</h1>

      <form onSubmit={handleFilter} className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Budget (AED)</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="mt-1 block w-40 rounded border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2"
            placeholder="e.g. 100000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Min Range (km)</label>
          <input
            type="number"
            value={minRange}
            onChange={(e) => setMinRange(e.target.value)}
            className="mt-1 block w-40 rounded border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2"
            placeholder="e.g. 300"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Filter
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-center py-8">Loading...</p>
      ) : cars.length === 0 ? (
        <p className="text-gray-600">No matching cars.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <Link
              key={car.car_id}
              to={`/car/${car.car_id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <img
                src={car.image_url}
                alt={car.model}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h2 className="text-xl font-semibold">{car.model}</h2>
                <p className="text-gray-600">{car.year} · {car.range_km} km range</p>
                <p className="text-green-600 font-bold mt-2">
                  AED {car.price.toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
