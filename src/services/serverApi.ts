import { cookies } from 'next/headers'
import { COOKIE_NAMES } from '@/constants/storage'
import { AUTH_API } from '@/constants/api.constant'
import type { AuthUser } from '@/types/auth'

export async function serverFetch(url: string, init?: RequestInit) {
  const cookieStore = await cookies()
  // The server can read the HttpOnly access cookie and forward it as a Bearer
  // token (CookieJWTAuthentication accepts either).
  const token = cookieStore.get(COOKIE_NAMES.accessToken)?.value

  const headers = new Headers(init?.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(url, { ...init, headers })
}

/**
 * Resolve the current user during SSR from the HttpOnly access cookie.
 * Used to seed the client AuthProvider so there is no client-side session
 * check / loading flash on initial load. Returns null when unauthenticated.
 */
export async function getServerUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  if (!cookieStore.get(COOKIE_NAMES.accessToken)?.value) return null

  try {
    const res = await serverFetch(AUTH_API.me, { cache: 'no-store' })
    if (!res.ok) return null
    const payload = await res.json()
    return (payload.data ?? payload) as AuthUser
  } catch {
    return null
  }
}
