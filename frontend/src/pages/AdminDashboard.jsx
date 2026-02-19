import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login')
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user) {
      api.get('/cars')
        .then((res) => setCars(res.data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [user])

  const handleDelete = async (carId) => {
    if (!confirm('Are you sure you want to delete this car?')) return

    try {
      await api.delete(`/cars/${carId}`)
      setCars((prev) => prev.filter((c) => c.car_id !== carId))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete car')
    }
  }

  if (authLoading || !user) {
    return <p className="text-center py-8">Loading...</p>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Link
          to="/admin/car/new"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Add New Car
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
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cars.map((car) => (
                <tr key={car.car_id}>
                  <td className="px-4 py-3">{car.model}</td>
                  <td className="px-4 py-3">{car.year}</td>
                  <td className="px-4 py-3">AED {car.price.toLocaleString()}</td>
                  <td className="px-4 py-3">{car.range_km} km</td>
                  <td className="px-4 py-3 text-right space-x-2">
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
