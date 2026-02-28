// ═══════════════════════════════════════════════════════════════════════════════
// Admin Leads Page (Feature 2: Customer Interest & Lead Management)
// ═══════════════════════════════════════════════════════════════════════════════
// This page displays all customer leads (interest submissions) for the admin.
// Leads are created when customers click "Show Interest" on a car listing.
//
// Features:
//   - View all leads with customer details
//   - See which car each lead is interested in
//   - Delete leads after follow-up is complete
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function AdminLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal state for car preview
  const [carModal, setCarModal] = useState({ open: false, car: null, loading: false })

  // Fetch leads on mount
  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads')
      setLeads(res.data)
    } catch (err) {
      setError('Failed to load leads')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Delete a lead after follow-up
  const handleDelete = async (leadId) => {
    if (!window.confirm('Mark this lead as handled and remove it?')) return
    
    try {
      await api.delete(`/leads/${leadId}`)
      setLeads(leads.filter(l => l.lead_id !== leadId))
    } catch (err) {
      alert('Failed to delete lead')
      console.error(err)
    }
  }

  // Format date for display
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A'
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading leads...</div>
      </div>
    )
  }

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
                {/* Car Image */}
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
        <h1 className="text-3xl font-bold">Customer Leads</h1>
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

      {/* Leads Table */}
      {leads.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No leads yet. Leads will appear here when customers show interest in cars.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Car Interest
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.lead_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{lead.name}</div>
                    <div className="text-sm text-gray-500">
                      <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openCarModal(lead.car_id)}
                      className="text-blue-600 hover:underline text-left"
                    >
                      {lead.car_model || `Car #${lead.car_id}`}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {lead.message || <span className="italic">No message</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(lead.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(lead.lead_id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Mark Handled
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-500">
        Total leads: {leads.length}
      </div>
    </div>
  )
}
