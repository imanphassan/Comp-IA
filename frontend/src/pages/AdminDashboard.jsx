// ═══════════════════════════════════════════════════════════════════════════════
// Admin Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
// Central hub for admin operations including:
//   - Car inventory management (CRUD)
//   - Mark cars as sold (Feature 1)
//   - Links to Analytics, Leads, and Appointments
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function AdminDashboard() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal state for marking car as sold
  const [sellModal, setSellModal] = useState({ open: false, car: null })
  const [salePrice, setSalePrice] = useState('')
  const [sellLoading, setSellLoading] = useState(false)
  
  // Modal state for car preview
  const [carModal, setCarModal] = useState({ open: false, car: null })

  // Fetch cars on mount (auth is handled by AdminLayout)
  useEffect(() => {
    api.get('/cars')
      .then((res) => setCars(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  // Delete car with confirmation
  const handleDelete = async (carId) => {
    if (!confirm('Are you sure you want to delete this car?')) return

    try {
      await api.delete(`/cars/${carId}`)
      setCars((prev) => prev.filter((c) => c.car_id !== carId))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete car')
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // MARK AS SOLD (Feature 1)
  // ─────────────────────────────────────────────────────────────────────────
  const openSellModal = (car) => {
    setSellModal({ open: true, car })
    setSalePrice(car.price.toString()) // Default to listing price
  }
  
  const closeSellModal = () => {
    setSellModal({ open: false, car: null })
    setSalePrice('')
  }
  
  const handleSell = async () => {
    if (!salePrice || parseFloat(salePrice) <= 0) {
      alert('Please enter a valid sale price')
      return
    }
    
    setSellLoading(true)
    try {
      const res = await api.post(`/cars/${sellModal.car.car_id}/sell`, {
        sale_price: parseFloat(salePrice)
      })
      // Update car in list
      setCars(prev => prev.map(c => 
        c.car_id === sellModal.car.car_id ? res.data : c
      ))
      closeSellModal()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark as sold')
    } finally {
      setSellLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CAR PREVIEW MODAL
  // ─────────────────────────────────────────────────────────────────────────
  const openCarModal = (car) => {
    setCarModal({ open: true, car })
  }

  const closeCarModal = () => {
    setCarModal({ open: false, car: null })
  }

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return ''
    return imageUrl.startsWith('/api') 
      ? `http://localhost:5001${imageUrl}` 
      : imageUrl
  }

  return (
    <div>
      {/* Car Preview Modal */}
      {carModal.open && carModal.car && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 overflow-hidden">
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
                <div className="bg-green-100 text-green-700 px-3 py-2 rounded mb-4 text-sm font-medium">
                  Sold for AED {carModal.car.sale_price?.toLocaleString()}
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
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {sellModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Mark as Sold</h3>
            <p className="text-gray-600 mb-4">
              Recording sale for: <strong>{sellModal.car?.model}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Final Sale Price (AED)
              </label>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Enter sale price"
              />
              <p className="text-sm text-gray-500 mt-1">
                Listing price: AED {sellModal.car?.price.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={closeSellModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSell}
                disabled={sellLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {sellLoading ? 'Processing...' : 'Confirm Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Link
          to="/admin/car/new"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Add New Car
        </Link>
      </div>
      
      {/* Quick Links to New Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link
          to="/admin/analytics"
          className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="font-semibold">Analytics</div>
          <div className="text-sm text-gray-500">View revenue & sales data</div>
        </Link>
        <Link
          to="/admin/leads"
          className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">📧</div>
          <div className="font-semibold">Leads</div>
          <div className="text-sm text-gray-500">Customer interest submissions</div>
        </Link>
        <Link
          to="/admin/appointments"
          className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">📅</div>
          <div className="font-semibold">Appointments</div>
          <div className="text-sm text-gray-500">Scheduled test drives</div>
        </Link>
      </div>

      {loading ? (
        <p className="text-center py-8">Loading cars...</p>
      ) : cars.length === 0 ? (
        <p className="text-gray-600">No cars in the database.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Model</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Year</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Range</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cars.map((car) => (
                <tr key={car.car_id} className={car.status === 'sold' ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openCarModal(car)}
                      className="text-blue-600 hover:underline text-left"
                    >
                      {car.model}
                    </button>
                  </td>
                  <td className="px-4 py-3">{car.year}</td>
                  <td className="px-4 py-3">
                    {car.status === 'sold' ? (
                      <>
                        <span className="line-through text-gray-400">AED {car.price.toLocaleString()}</span>
                        <br />
                        <span className="text-green-600 font-medium">Sold: AED {car.sale_price?.toLocaleString()}</span>
                      </>
                    ) : (
                      `AED ${car.price.toLocaleString()}`
                    )}
                  </td>
                  <td className="px-4 py-3">{car.range_km} km</td>
                  <td className="px-4 py-3">
                    {car.status === 'sold' ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                        SOLD
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        Available
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {car.status !== 'sold' && (
                      <button
                        onClick={() => openSellModal(car)}
                        className="text-green-600 hover:underline"
                      >
                        Sell
                      </button>
                    )}
                    <Link
                      to={`/admin/car/${car.car_id}/edit`}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(car.car_id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
