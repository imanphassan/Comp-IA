import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

export default function CarForm() {
  const { carId } = useParams()
  const isEdit = Boolean(carId)
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    model: '',
    year: '',
    price: '',
    range_km: '',
    charge_time_min: '',
    description: '',
    image_url: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login')
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (isEdit && user) {
      api.get(`/cars/${carId}`)
        .then((res) => {
          const car = res.data
          setFormData({
            model: car.model,
            year: car.year.toString(),
            price: car.price.toString(),
            range_km: car.range_km.toString(),
            charge_time_min: car.charge_time_min.toString(),
            description: car.description,
            image_url: car.image_url,
          })
        })
        .catch((err) => {
          alert(err.response?.data?.error || 'Failed to load car')
          navigate('/admin')
        })
        .finally(() => setLoading(false))
    }
  }, [carId, isEdit, user, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})

    const payload = {
      model: formData.model,
      year: parseInt(formData.year, 10),
      price: parseFloat(formData.price),
      range_km: parseInt(formData.range_km, 10),
      charge_time_min: parseInt(formData.charge_time_min, 10),
      description: formData.description,
      image_url: formData.image_url,
    }

    try {
      if (isEdit) {
        await api.put(`/cars/${carId}`, payload)
      } else {
        await api.post('/cars', payload)
      }
      navigate('/admin')
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors)
      } else {
        alert(err.response?.data?.error || 'Failed to save car')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || !user || loading) {
    return <p className="text-center py-8">Loading...</p>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        {isEdit ? 'Edit Car' : 'Add New Car'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input
            type="text"
            name="model"
            value={formData.model}
            onChange={handleChange}
            className={`w-full rounded border p-3 ${errors.model ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.model && <p className="text-red-500 text-sm mt-1">{errors.model}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className={`w-full rounded border p-3 ${errors.year ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (AED)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className={`w-full rounded border p-3 ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Range (km)</label>
            <input
              type="number"
              name="range_km"
              value={formData.range_km}
              onChange={handleChange}
              className={`w-full rounded border p-3 ${errors.range_km ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.range_km && <p className="text-red-500 text-sm mt-1">{errors.range_km}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Charge Time (min)</label>
            <input
              type="number"
              name="charge_time_min"
              value={formData.charge_time_min}
              onChange={handleChange}
              className={`w-full rounded border p-3 ${errors.charge_time_min ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.charge_time_min && <p className="text-red-500 text-sm mt-1">{errors.charge_time_min}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className={`w-full rounded border p-3 ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
          <input
            type="text"
            name="image_url"
            value={formData.image_url}
            onChange={handleChange}
            className={`w-full rounded border p-3 ${errors.image_url ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.image_url && <p className="text-red-500 text-sm mt-1">{errors.image_url}</p>}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
