// Authentication context for managing user login state
import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

// Provider component that wraps the app and provides auth state
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // Login and store JWT token
  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    localStorage.setItem('token', res.data.token)
    setUser({ username: res.data.username })
    return res.data
  }

  // Logout and clear token
  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to access auth context
export function useAuth() {
  return useContext(AuthContext)
}
