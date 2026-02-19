import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function Home() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/cars/featured')
      .then((res) => setCars(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-center py-8">Loading...</p>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Featured Electric Vehicles</h1>
      {cars.length === 0 ? (
        <p className="text-gray-600">No cars yet.</p>
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
                <p className="text-gray-600">{car.year}</p>
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
