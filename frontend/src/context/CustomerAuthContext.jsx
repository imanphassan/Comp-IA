// ═══════════════════════════════════════════════════════════════════════════════
// Customer Authentication Context
// ═══════════════════════════════════════════════════════════════════════════════
// Manages customer authentication state separately from admin authentication.
// Customers have different capabilities than admins:
//   - Browse and save cars to their garage
//   - Submit interest forms and book appointments
//   - View their saved cars across devices
// ═══════════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const CustomerAuthContext = createContext(null)

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('customerToken'))
  const [loading, setLoading] = useState(true)

  // Check for existing customer token on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('customerToken')
    if (storedToken) {
      // Verify token is still valid
      api.get('/customer/me', {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
        .then((res) => {
          setCustomer(res.data.customer)
          setToken(storedToken)
        })
        .catch(() => {
          localStorage.removeItem('customerToken')
          setCustomer(null)
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // Register new customer
  const register = async (name, email, password, phone = '') => {
    const res = await api.post('/customer/register', { name, email, password, phone })
    const newToken = res.data.token
    // Store token in localStorage FIRST before updating state
    localStorage.setItem('customerToken', newToken)
    // Update state synchronously
    setToken(newToken)
    setCustomer(res.data.customer)
    // Return a promise that resolves after state updates
    return new Promise((resolve) => {
      setTimeout(() => resolve(res.data), 50)
    })
  }

  // Login existing customer
  const login = async (email, password) => {
    const res = await api.post('/customer/login', { email, password })
    const newToken = res.data.token
    // Store token in localStorage FIRST before updating state
    localStorage.setItem('customerToken', newToken)
    // Update state synchronously
    setToken(newToken)
    setCustomer(res.data.customer)
    // Return a promise that resolves after state updates
    return new Promise((resolve) => {
      setTimeout(() => resolve(res.data), 50)
    })
  }

  // Logout customer
  const logout = () => {
    localStorage.removeItem('customerToken')
    setToken(null)
    setCustomer(null)
  }

  // Get customer token for API calls
  const getToken = () => token

  return (
    <CustomerAuthContext.Provider value={{ 
      customer, 
      loading, 
      register, 
      login, 
      logout,
      getToken,
      isAuthenticated: !!customer && !!token
    }}>
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext)
  if (!context) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider')
  }
  return context
}
