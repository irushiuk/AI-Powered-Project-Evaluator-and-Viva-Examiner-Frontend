import { cookies } from 'next/headers'
import { COOKIE_NAMES } from '@/constants/storage'

export async function serverFetch(url: string, init?: RequestInit) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAMES.accessToken)?.value

  const headers = new Headers(init?.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(url, { ...init, headers })
}
