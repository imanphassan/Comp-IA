// ═══════════════════════════════════════════════════════════════════════════════
// Home Page - Car Listings with Search and Filters
// ═══════════════════════════════════════════════════════════════════════════════
// This is the main landing page of the EV Cars marketplace.
// It displays all car listings with real-time filtering and sorting.
//
// Features:
//   - Search by model name
//   - Filter by maximum budget (price)
//   - Filter by minimum range (km)
//   - Filter by year
//   - Sort by price, year, or range
//   - Client-side filtering for instant results
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'

export default function Home() {
  // ─────────────────────────────────────────────────────────────────────────
  // URL SEARCH PARAMS
  // ─────────────────────────────────────────────────────────────────────────
  // useSearchParams allows reading/writing URL query parameters.
  // This enables filter state to be preserved in the URL.
  const [searchParams, setSearchParams] = useSearchParams()
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  // cars: Currently displayed cars after filtering
  // allCars: Complete list from API (used as source for filtering)
  // loading: Shows loading state while fetching data
  const [cars, setCars] = useState([])        // Filtered cars to display
  const [allCars, setAllCars] = useState([])  // All cars from API
  const [loading, setLoading] = useState(true)
  
  // ─────────────────────────────────────────────────────────────────────────
  // FILTER STATE
  // ─────────────────────────────────────────────────────────────────────────
  // Each filter is initialized from URL params if present.
  // This allows users to bookmark or share filtered views.
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [budget, setBudget] = useState(searchParams.get('budget') || '')
  const [minRange, setMinRange] = useState(searchParams.get('min_range') || '')
  const [year, setYear] = useState(searchParams.get('year') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'price_asc')

  // ─────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────
  // Fetch all cars from the API when the component mounts.
  // We fetch all cars once and filter client-side for instant results.
  useEffect(() => {
    api.get('/cars')
      .then((res) => {
        setAllCars(res.data)  // Store complete list for filtering
        setCars(res.data)     // Initially show all cars
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])  // Empty array = run once on mount

  // ─────────────────────────────────────────────────────────────────────────
  // CLIENT-SIDE FILTERING AND SORTING
  // ─────────────────────────────────────────────────────────────────────────
  // This effect runs whenever any filter value changes.
  // It applies all active filters to the complete car list and sorts results.
  //
  // Benefits of client-side filtering:
  // - Instant feedback without API calls
  // - Reduces server load
  // - Works offline after initial load
  useEffect(() => {
    // Start with a copy of all cars (spread operator creates new array)
    let filtered = [...allCars]

    // SEARCH FILTER: Match model name (case-insensitive)
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(car => 
        car.model.toLowerCase().includes(searchLower)
      )
    }

    // BUDGET FILTER: Only show cars at or below budget
    if (budget) {
      filtered = filtered.filter(car => car.price <= parseFloat(budget))
    }

    // RANGE FILTER: Only show cars with at least this range
    if (minRange) {
      filtered = filtered.filter(car => car.range_km >= parseInt(minRange))
    }

    // YEAR FILTER: Exact year match
    if (year) {
      filtered = filtered.filter(car => car.year === parseInt(year))
    }

    // SORTING: Apply selected sort order
    // Array.sort() modifies in place, comparing pairs of elements
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price)  // Lowest price first
        break
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price)  // Highest price first
        break
      case 'year_desc':
        filtered.sort((a, b) => b.year - a.year)    // Newest first
        break
      case 'range_desc':
        filtered.sort((a, b) => b.range_km - a.range_km)  // Longest range first
        break
    }

    // Update displayed cars with filtered/sorted results
    setCars(filtered)
  }, [allCars, search, budget, minRange, year, sortBy])  // Re-run when any dependency changes

  // ─────────────────────────────────────────────────────────────────────────
  // CLEAR FILTERS
  // ─────────────────────────────────────────────────────────────────────────
  // Reset all filter values to their defaults.
  // Also clears URL parameters.
  const clearFilters = () => {
    setSearch('')
    setBudget('')
    setMinRange('')
    setYear('')
    setSortBy('price_asc')
    setSearchParams({})  // Clear URL query string
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DYNAMIC YEAR OPTIONS
  // ─────────────────────────────────────────────────────────────────────────
  // Extract unique years from car data for the year filter dropdown.
  // Set ensures uniqueness, spread converts back to array for sorting.
  const years = [...new Set(allCars.map(car => car.year))].sort((a, b) => b - a)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Find your perfect EV</h1>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2"
              placeholder="Search by model..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Budget (AED)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-40 rounded border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2"
              placeholder="e.g. 100000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Range (km)</label>
            <input
              type="number"
              value={minRange}
              onChange={(e) => setMinRange(e.target.value)}
              className="w-40 rounded border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2"
              placeholder="e.g. 300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-32 rounded border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2"
            >
              <option value="">All</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-40 rounded border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2"
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="year_desc">Newest First</option>
              <option value="range_desc">Longest Range</option>
            </select>
          </div>
          {(search || budget || minRange || year || sortBy !== 'price_asc') && (
            <button
              onClick={clearFilters}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-center py-8">Loading...</p>
      ) : cars.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 text-lg">No cars match your filters.</p>
          <button
            onClick={clearFilters}
            className="mt-4 text-green-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-gray-600 mb-4">{cars.length} vehicle{cars.length !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cars.map((car) => (
              <Link
                key={car.car_id}
                to={`/car/${car.car_id}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <img
                  src={car.image_url.startsWith('/api') ? `http://localhost:5001${car.image_url}` : car.image_url}
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
        </>
      )}
    </div>
  )
}
