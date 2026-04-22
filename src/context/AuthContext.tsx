import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api, tokenStore, mapUser, ApiError, API_BASE } from '../lib/api'
import { useCompany } from './CompanyContext'
import type { User, UserRole } from '../types'

interface AuthContextType {
  user:    User | null
  loading: boolean
  error:   string | null
  login:   (email: string, password: string) => Promise<User | undefined>
  mobileLogin: (code: string, password: string) => Promise<{ user: User; mustChangePassword: boolean }>
  logout:  () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)   // true until session restored
  const [error,   setError]   = useState<string | null>(null)
  const { syncFromBackend } = useCompany()

  // ── On mount: try to restore session via refresh token cookie ──────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (res.ok) {
          const body = await res.json()
          tokenStore.set(body.data.accessToken)
          const me = await api.get<any>('/auth/me')
          if (!cancelled) {
            setUser(mapUser(me))
            // Sync company sector from backend so UI reflects actual DB sector
            if (me.company) syncFromBackend(me.company)
          }
        }
      } catch {
        // No valid session - stay logged out
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const login = async (email: string, password: string) => {
    setError(null)
    try {
      const result = await api.post<any>('/auth/login', { email, password })
      tokenStore.set(result.accessToken)
      const mapped = mapUser(result.user)
      setUser(mapped)
      // Fetch full profile to sync company sector
      try {
        const me = await api.get<any>('/auth/me')
        if (me?.company) syncFromBackend(me.company)
      } catch { /* non-critical */ }
      return mapped
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : 'Giris yapilamadi'
      setError(msg)
      throw e
    }
  }

  const mobileLogin = async (code: string, password: string) => {
    setError(null)
    try {
      const result = await api.post<any>('/mobile-auth/login', { code, password })
      tokenStore.set(result.accessToken)
      const mapped = mapUser(result.user)
      setUser(mapped)
      return { user: mapped, mustChangePassword: result.mustChangePassword ?? false }
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : 'Giris yapilamadi'
      setError(msg)
      throw e
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch { /* ignore */ }
    tokenStore.set(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, mobileLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useCanAccess(minRole: UserRole): boolean {
  const { user } = useAuth()
  if (!user) return false
  const HIERARCHY: Record<UserRole, number> = {
    super_admin: 10, platform_admin: 9, genel_mudur: 8, gm_yardimcisi: 7, direktor: 6,
    mudur: 5, supervizor: 4, muhendis: 3, teknisyen: 2, isci: 1,
  }
  return HIERARCHY[user.role] >= HIERARCHY[minRole]
}
