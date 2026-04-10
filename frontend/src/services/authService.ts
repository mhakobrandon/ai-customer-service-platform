/**
 * Authentication Service
 * Manages user authentication state with React Context
 * Supports multi-role authentication: Admin, Supervisor, Agent, Customer
 */

import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import { authAPI } from './apiService'

interface User {
  id: string
  name: string
  email: string
  role: 'customer' | 'agent' | 'supervisor' | 'admin'
  preferred_language: string
  specialization?: string
  department?: string
  languages?: string
  status?: string
  can_manage_agents?: boolean
  can_view_analytics?: boolean
  can_handle_escalations?: boolean
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>
  logout: () => void
  isCustomer: boolean
  isAgent: boolean
  isSupervisor: boolean
  isAdmin: boolean
  isStaff: boolean
  canViewAnalytics: boolean
  canManageAgents: boolean
  canHandleEscalations: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
  })

  useEffect(() => {
    // Check for existing token and user data
    const token = localStorage.getItem('access_token')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      setAuthState({
        isAuthenticated: true,
        user: JSON.parse(userData),
        loading: false,
      })
    } else {
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
      })
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password)
      const { access_token, user } = response.data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('user', JSON.stringify(user))

      setAuthState({
        isAuthenticated: true,
        user,
        loading: false,
      })

      return { success: true, user }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')

    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
    })
  }

  // Role-based computed properties
  const role = authState.user?.role
  const isCustomer = role === 'customer'
  const isAgent = role === 'agent'
  const isSupervisor = role === 'supervisor'
  const isAdmin = role === 'admin'
  const isStaff = ['agent', 'supervisor', 'admin'].includes(role || '')
  const canViewAnalytics = ['supervisor', 'admin'].includes(role || '') || authState.user?.can_view_analytics || false
  const canManageAgents = ['supervisor', 'admin'].includes(role || '') || authState.user?.can_manage_agents || false
  const canHandleEscalations = isStaff || authState.user?.can_handle_escalations || false

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    isCustomer,
    isAgent,
    isSupervisor,
    isAdmin,
    isStaff,
    canViewAnalytics,
    canManageAgents,
    canHandleEscalations,
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
