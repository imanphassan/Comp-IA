// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Dashboard (Feature 1: Revenue & Analytics)
// ═══════════════════════════════════════════════════════════════════════════════
// This page displays sales analytics for the admin including:
//   - Summary metrics (total revenue, cars sold, average price)
//   - Bar chart showing sales by car model
//   - Line chart showing revenue over time
//
// Uses Chart.js for data visualization, demonstrating abstraction of
// complex charting logic into a reusable library.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import api from '../api'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

export default function Analytics() {
  // ─────────────────────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null)
  const [salesByModel, setSalesByModel] = useState([])
  const [revenueOverTime, setRevenueOverTime] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ─────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────
  // Fetch all analytics data on component mount
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [summaryRes, salesRes, revenueRes] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/analytics/sales-by-model'),
          api.get('/analytics/revenue-over-time'),
        ])
        setSummary(summaryRes.data)
        setSalesByModel(salesRes.data)
        setRevenueOverTime(revenueRes.data)
      } catch (err) {
        setError('Failed to load analytics data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // CHART CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  // Bar chart data for sales by model
  const barChartData = {
    labels: salesByModel.map(item => item.model),
    datasets: [
      {
        label: 'Cars Sold',
        data: salesByModel.map(item => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  }

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Sales by Car Model' },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  }

  // Line chart data for revenue over time
  const lineChartData = {
    labels: revenueOverTime.map(item => {
      // Format "2024-01" to "Jan 2024"
      const [year, month] = item.month.split('-')
      const date = new Date(year, parseInt(month) - 1)
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }),
    datasets: [
      {
        label: 'Revenue (AED)',
        data: revenueOverTime.map(item => item.revenue),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  }

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Revenue Over Time' },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `AED ${value.toLocaleString()}`,
        },
      },
    },
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Link
          to="/admin"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 uppercase tracking-wide">Total Revenue</div>
          <div className="text-3xl font-bold text-green-600">
            AED {summary?.total_revenue?.toLocaleString() || 0}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 uppercase tracking-wide">Cars Sold</div>
          <div className="text-3xl font-bold text-blue-600">
            {summary?.cars_sold || 0}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 uppercase tracking-wide">Average Sale Price</div>
          <div className="text-3xl font-bold text-purple-600">
            AED {summary?.average_sale_price?.toLocaleString() || 0}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 uppercase tracking-wide">Available Cars</div>
          <div className="text-3xl font-bold text-orange-600">
            {summary?.available_cars || 0}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Model Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          {salesByModel.length > 0 ? (
            <Bar data={barChartData} options={barChartOptions} />
          ) : (
            <div className="text-center text-gray-500 py-12">
              No sales data yet. Mark cars as sold to see analytics.
            </div>
          )}
        </div>

        {/* Revenue Over Time Line Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          {revenueOverTime.length > 0 ? (
            <Line data={lineChartData} options={lineChartOptions} />
          ) : (
            <div className="text-center text-gray-500 py-12">
              No revenue data yet. Mark cars as sold to see trends.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
