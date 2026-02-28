// ═══════════════════════════════════════════════════════════════════════════════
// API Client Configuration
// ═══════════════════════════════════════════════════════════════════════════════
// This module configures Axios as the HTTP client for all API requests.
// It provides:
//   - Centralized base URL configuration
//   - Automatic JWT token attachment to requests
//   - Consistent error handling across the application
// ═══════════════════════════════════════════════════════════════════════════════

import axios from 'axios'

// ─────────────────────────────────────────────────────────────────────────────
// AXIOS INSTANCE CREATION
// ─────────────────────────────────────────────────────────────────────────────
// Create a custom Axios instance with pre-configured settings.
// Using '/api' as baseURL works with Vite's proxy configuration,
// which forwards requests to the Flask backend during development.
const api = axios.create({
  baseURL: '/api',
})

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST INTERCEPTOR
// ─────────────────────────────────────────────────────────────────────────────
// Interceptors allow us to modify requests before they are sent.
// This interceptor automatically attaches the JWT token to every request,
// eliminating the need to manually add authorization headers each time.
//
// IMPORTANT: Only attach admin token if Authorization header is not already set.
// This allows customer API calls to use their own token by setting the header
// manually before making the request.
//
// Flow:
// 1. Check if Authorization header is already set (customer API calls)
// 2. If not set, check for admin token and attach it
// 3. Return the modified config to proceed with the request
api.interceptors.request.use((config) => {
  // Skip if Authorization header is already set (e.g., customer API calls)
  if (config.headers.Authorization) {
    return config
  }

  // Retrieve admin JWT token from browser's localStorage
  const token = localStorage.getItem('token')

  // If token exists, add Bearer authentication header
  // Format: "Bearer <token>" - standard JWT authentication format
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api
