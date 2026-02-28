// ═══════════════════════════════════════════════════════════════════════════════
// Authentication Context
// ═══════════════════════════════════════════════════════════════════════════════
// This module implements React Context for global authentication state management.
// It provides:
//   - Centralized user authentication state
//   - Login/logout functionality
//   - Automatic token validation on app load
//   - Loading state for auth-dependent components
//
// Usage:
//   1. Wrap app with <AuthProvider> in main.jsx
//   2. Use useAuth() hook in any component to access auth state
// ═══════════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

// Create the context with null default value
// Components using useAuth() outside of AuthProvider will get null
const AuthContext = createContext(null)


// ─────────────────────────────────────────────────────────────────────────────
// AUTH PROVIDER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
// This component wraps the entire application and provides authentication
// state to all child components through React Context.
export function AuthProvider({ children }) {
  // ─────────────────────────────────────────────────────────────────────────
  // State Management
  // ─────────────────────────────────────────────────────────────────────────
  // user: Current authenticated user object or null if not logged in
  // loading: True while checking for existing token on app load
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // ─────────────────────────────────────────────────────────────────────────
  // TOKEN VALIDATION ON APP LOAD
  // ─────────────────────────────────────────────────────────────────────────
  // When the app loads, check if there's a stored token and validate it.
  // This allows users to stay logged in across page refreshes.
  //
  // Flow:
  // 1. Check localStorage for existing token
  // 2. If token exists, call /auth/me to validate and get user info
  // 3. If validation fails (expired/invalid token), clear the token
  // 4. Set loading to false when check is complete
  useEffect(() => {
    const token = localStorage.getItem('token')
    
    if (token) {
      // Validate token by fetching current user info
      api.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          // Token is invalid or expired - clear it
          localStorage.removeItem('token')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      // No token stored - user is not logged in
      setLoading(false)
    }
  }, [])  // Empty dependency array = run once on mount

  // ─────────────────────────────────────────────────────────────────────────
  // LOGIN FUNCTION
  // ─────────────────────────────────────────────────────────────────────────
  // Authenticate user with username and password.
  // On success, stores the JWT token and updates user state.
  //
  // Args:
  //   username: Admin username
  //   password: Admin password
  //
  // Returns:
  //   Response data containing token and username
  //
  // Throws:
  //   Error if credentials are invalid (caught by calling component)
  const login = async (username, password) => {
    // Send credentials to login endpoint
    const res = await api.post('/auth/login', { username, password })
    
    // Store token in localStorage for persistence across page refreshes
    localStorage.setItem('token', res.data.token)
    
    // Update user state to trigger re-renders in auth-dependent components
    setUser({ username: res.data.username })
    
    return res.data
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGOUT FUNCTION
  // ─────────────────────────────────────────────────────────────────────────
  // Clear authentication state and remove stored token.
  // This immediately logs the user out across all components.
  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token')
    
    // Clear user state - this triggers re-renders showing logged-out state
    setUser(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT PROVIDER
  // ─────────────────────────────────────────────────────────────────────────
  // Provide auth state and functions to all child components.
  // Any component can access these via the useAuth() hook.
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// AUTH HOOK
// ─────────────────────────────────────────────────────────────────────────────
// Custom hook for accessing authentication context.
// This provides a cleaner API than using useContext directly.
//
// Returns:
//   { user, loading, login, logout }
//
// Usage:
//   const { user, login, logout } = useAuth()
export function useAuth() {
  return useContext(AuthContext)
}
