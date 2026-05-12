"use client"

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { AuthUser, RegisterStudentRequest } from "@/types/auth"
import * as authService from "@/services/authService"
import { setAccessTokenGetter, setLogoutCallback } from "@/services/apiClient"
import { STORAGE_KEYS, COOKIE_NAMES } from "@/constants/storage"
import { getPostLoginRedirect } from "@/utils/routes"
import { toast } from "sonner"

type AuthContextType = {
  user: AuthUser | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  registerStudent: (payload: RegisterStudentRequest) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<string>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function setCookie(name: string, value: string, days = 7) {
  if (typeof window === "undefined") return
  const maxAge = days * 24 * 60 * 60
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Strict`
}

function clearCookie(name: string) {
  if (typeof window === "undefined") return
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = Boolean(user)

  // Helper: decode JWT payload
  const decodePayload = useCallback((token?: string | null) => {
    if (!token) return null
    try {
      const payload = token.split('.')[1]
      if (!payload) return null
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      return JSON.parse(decoded)
    } catch {
      return null
    }
  }, [])

  const applyTokens = useCallback((tokens: { access: string; refresh: string }) => {
    setAccessToken(tokens.access)
    const payload = decodePayload(tokens.access)
    const expiresAt = typeof payload?.exp === 'number' ? String(payload.exp * 1000) : ''
    localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh)
    localStorage.setItem(STORAGE_KEYS.accessTokenExpiresAt, expiresAt)
    setCookie(COOKIE_NAMES.hasSession, "true")
  }, [decodePayload])

  const refreshToken = useCallback(async () => {
    const refresh = localStorage.getItem(STORAGE_KEYS.refreshToken)
    if (!refresh) throw new Error('No refresh token')
    const tokens = await authService.refreshAccessToken(refresh)
    applyTokens(tokens)
    return tokens.access
  }, [applyTokens])

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem(STORAGE_KEYS.refreshToken)
    const token = accessToken

    try {
      if (refresh && token) {
        await authService.logout(refresh, token)
      }
    } catch {
      // ignore errors from logout endpoint
    }

    localStorage.removeItem(STORAGE_KEYS.refreshToken)
    localStorage.removeItem(STORAGE_KEYS.user)
    localStorage.removeItem(STORAGE_KEYS.accessTokenExpiresAt)
    clearCookie(COOKIE_NAMES.hasSession)
    clearCookie(COOKIE_NAMES.userRole)
    setUser(null)
    setAccessToken(null)
    
    toast.success("You have been logged out successfully.")
    
    router.push('/login')
  }, [accessToken, router])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const data = await authService.login(email, password)
      setUser(data.user)
      applyTokens({ access: data.access, refresh: data.refresh })
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user))
      setCookie(COOKIE_NAMES.userRole, data.user.role)

      toast.success(`Welcome back, ${data.user.full_name || 'User'}!`)
      
      // role-based redirect
      router.push(getPostLoginRedirect(data.user.role))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed")
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [applyTokens, router])

  const registerStudent = useCallback(async (payload: RegisterStudentRequest) => {
    setIsLoading(true)
    try {
      const data = await authService.registerStudent(payload)

      // Backend returns data: null on success (no auto-login)
      if (!data.user) {
        toast.success(data.message || "Registration successful! Please log in.")
        router.push('/login')
        return
      }

      setUser(data.user)

      if (data.access && data.refresh) {
        applyTokens({ access: data.access, refresh: data.refresh })
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user))
        setCookie(COOKIE_NAMES.userRole, data.user.role)
        toast.success("Account created successfully!")
        router.push(getPostLoginRedirect(data.user.role))
        return
      }

      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user))
      setCookie(COOKIE_NAMES.userRole, data.user.role)
      toast.success("Account created successfully!")
      router.push('/login')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed")
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [applyTokens, router])

  // Provide access token getter for apiClient
  useEffect(() => {
    setAccessTokenGetter(() => accessToken)
  }, [accessToken])

  // Provide logout callback to apiClient
  useEffect(() => {
    setLogoutCallback(logout)
  }, [logout])

  // Multi-tab sync: update refresh token if changed, logout if removed
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.refreshToken) {
        if (!e.newValue) {
          setUser(null)
          setAccessToken(null)
        }
      }
      if (e.key === STORAGE_KEYS.user && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          setUser(parsed)
        } catch {
          /* ignore */
        }
      }
    }

    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  // Startup logic: try to restore session from access token (if fresh) or refresh token (if needed)
  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const refresh = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.refreshToken) : null
        const storedExpiry = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.accessTokenExpiresAt) : null
        const expiresAt = storedExpiry ? Number(storedExpiry) : 0
        const now = Date.now()
        const hasFreshTokenWindow = expiresAt > now + 5 * 60 * 1000

        const parseStoredUser = () => {
          const rawUser = localStorage.getItem(STORAGE_KEYS.user)
          if (!rawUser) return null

          try {
            const parsed = JSON.parse(rawUser)
            if (!parsed || typeof parsed !== 'object') return null
            if (typeof parsed.id !== 'string' && typeof parsed.id !== 'number') return null
            if (typeof parsed.role !== 'string') return null
            return parsed as AuthUser
          } catch {
            return null
          }
        }

        // If the access token should still be valid, refresh silently and restore user from storage.
        if (hasFreshTokenWindow) {
          const storedUser = parseStoredUser()
          if (storedUser && refresh) {
            try {
              const tokens = await authService.refreshAccessToken(refresh)
              if (!mounted) return
              applyTokens(tokens)
              setUser(storedUser)
            } catch {
              // Transient failure — still restore from storage so user isn't logged out.
              if (mounted) setUser(storedUser)
            }
            return
          }
        }

        if (!refresh) {
          return
        }

        const tokens = await authService.refreshAccessToken(refresh)
        if (!mounted) return

        applyTokens(tokens)
        const currentUser = await authService.getCurrentUser(tokens.access)
        if (!mounted) return
        setUser(currentUser)
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(currentUser))
      } catch (err) {
        if (!mounted) return

        // Only clear the session for real auth rejections (401/403).
        // Transient network errors should NOT log the user out on a simple page refresh.
        const status = (err as { status?: number })?.status
        const isAuthError = status === 401 || status === 403

        if (isAuthError) {
          localStorage.removeItem(STORAGE_KEYS.refreshToken)
          localStorage.removeItem(STORAGE_KEYS.user)
          localStorage.removeItem(STORAGE_KEYS.accessTokenExpiresAt)
          clearCookie(COOKIE_NAMES.hasSession)
          clearCookie(COOKIE_NAMES.userRole)
          setUser(null)
          setAccessToken(null)
        } else {
          // Transient failure — restore stored user so the page doesn't redirect to /login.
          const storedUser = (() => {
            const rawUser = localStorage.getItem(STORAGE_KEYS.user)
            if (!rawUser) return null
            try { return JSON.parse(rawUser) as AuthUser } catch { return null }
          })()
          if (storedUser) setUser(storedUser)
        }
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    init()
    return () => {
      mounted = false
    }
  }, [applyTokens])

  const value = useMemo(
    () => ({ user, accessToken, isLoading, isAuthenticated, login, registerStudent, logout, refreshToken }),
    [user, accessToken, isLoading, isAuthenticated, login, registerStudent, logout, refreshToken]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}

export default AuthProvider
