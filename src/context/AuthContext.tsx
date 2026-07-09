"use client"

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { AuthUser, RegisterStudentRequest } from "@/types/auth"
import * as authService from "@/services/authService"
import { setLogoutCallback } from "@/services/apiClient"
import { getPostLoginRedirect } from "@/utils/routes"
import { toast } from "sonner"

type AuthContextType = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  registerStudent: (payload: RegisterStudentRequest) => Promise<void>
  logout: () => Promise<void>
  revalidate: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Auth state is seeded from the server (`initialUser`) via the HttpOnly access
 * cookie, so there is no client-side session check on first render — the user
 * is known at paint time. Tokens live only in HttpOnly cookies; this provider
 * never touches localStorage or document.cookie.
 */
export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode
  initialUser?: AuthUser | null
}) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(initialUser)
  const [isLoading, setIsLoading] = useState(false)

  const isAuthenticated = Boolean(user)

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const data = await authService.login(email, password)
      setUser(data.user)

      toast.success(`Welcome back, ${data.user.full_name || "User"}!`)

      // The backend has set the HttpOnly cookies on this response; navigate and
      // refresh so server components re-render with the authenticated session.
      router.push(getPostLoginRedirect(data.user.role))
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed")
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const registerStudent = useCallback(async (payload: RegisterStudentRequest) => {
    setIsLoading(true)
    try {
      const data = await authService.registerStudent(payload)

      // Registration does not auto-login (backend returns data: null).
      if (!data.user) {
        toast.success(data.message || "Registration successful! Please log in.")
        router.push("/login")
        return
      }

      setUser(data.user)
      toast.success("Account created successfully!")
      router.push(getPostLoginRedirect(data.user.role))
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed")
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    toast.success("You have been logged out successfully.")
    router.push("/login")
    router.refresh()
  }, [router])

  // Re-fetch the current user (e.g. after a profile update). Cheap no-op-ish.
  const revalidate = useCallback(async () => {
    try {
      const current = await authService.getCurrentUser()
      setUser(current)
    } catch {
      setUser(null)
    }
  }, [])

  // Let apiClient trigger a logout when a request is unauthorized after refresh.
  useEffect(() => {
    setLogoutCallback(logout)
  }, [logout])

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated, login, registerStudent, logout, revalidate }),
    [user, isLoading, isAuthenticated, login, registerStudent, logout, revalidate]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}

export default AuthProvider
