import { useEffect, useState, useCallback, useMemo } from 'react'
import { authApi } from '../api/authApi'
import { setAuthFailureHandler } from '../api/client'
import { AuthContext } from './authContextDef'
import { hasPermission as checkPermission, hasRole as checkRole, ROLE_PERMISSIONS } from '../auth/permissions'

const STORAGE_KEY = 'lmd-session'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage errors
    }
    setSession(null)
  }, [])

  useEffect(() => {
    setAuthFailureHandler(logout)
  }, [logout])

  const saveSession = useCallback((data) => {
    if (data && data.token) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {
        // Ignore storage errors
      }
      setSession(data)
    }
  }, [])

  const login = async (credentials) => {
    const data = await authApi.login(credentials)
    saveSession(data)
    return data
  }

  const register = async (userData) => {
    const data = await authApi.register(userData)
    saveSession(data)
    return data
  }

  const refreshProfile = async () => {
    if (!session?.token) return null
    try {
      const profile = await authApi.getProfile()
      const updated = { ...session, ...profile }
      saveSession(updated)
      return updated
    } catch (err) {
      if (err.message?.includes('expired') || err.message?.includes('session')) {
        logout()
      }
      throw err
    }
  }

  const user = useMemo(() => {
    if (!session) return null
    const role = session.role
    const permissions = session.permissions || ROLE_PERMISSIONS[role] || []
    return {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      permissions,
    }
  }, [session])

  const hasPerm = useCallback((permission) => checkPermission(user, permission), [user])
  const checkUserRole = useCallback((...roles) => checkRole(user, ...roles), [user])

  const value = {
    session,
    user,
    token: session?.token ?? null,
    isAuthenticated: !!session?.token,
    role: session?.role ?? null,
    permissions: user?.permissions ?? [],
    isCustomer: session?.role === 'CUSTOMER',
    isAgent: session?.role === 'DELIVERY_AGENT',
    isAdmin: session?.role === 'ADMIN',
    isDispatcher: session?.role === 'DISPATCHER',
    isWarehouseStaff: session?.role === 'WAREHOUSE_STAFF',
    hasPermission: hasPerm,
    hasRole: checkUserRole,
    hasAnyRole: checkUserRole,
    login,
    register,
    logout,
    refreshProfile,
    saveSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
