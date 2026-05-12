import { LoginResponse, RegisterResponse, RegisterStudentRequest, RegisterExaminerRequest, TokenRefreshResponse } from '@/types/auth'
import { AUTH_API } from '@/constants/api.constant'

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(AUTH_API.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw err || new Error('Login failed')
  }
  const payload = await res.json()
  const data = payload.data ?? payload
  return {
    user: data.user,
    access: data.access,
    refresh: data.refresh,
  }
}

export async function refreshAccessToken(refresh: string): Promise<TokenRefreshResponse> {
  const res = await fetch(AUTH_API.refresh, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!res.ok) throw new Error('Failed to refresh token')
  const data = await res.json()
  return {
    access: data.access,
    refresh: data.refresh ?? refresh,
  }
}

export async function getCurrentUser(access: string) {
  const res = await fetch(AUTH_API.me, {
    headers: { Authorization: `Bearer ${access}` },
  })
  if (!res.ok) throw new Error('Failed to fetch user')
  const data = await res.json()
  return data
}

export async function logout(refresh: string, access?: string) {
  try {
    await fetch(AUTH_API.logout, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
      body: JSON.stringify({ refresh }),
    })
  } catch {
    // best-effort
  }
}

export async function registerStudent(payload: RegisterStudentRequest): Promise<RegisterResponse> {
  const res = await fetch(AUTH_API.registerStudent, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw err || new Error('Registration failed')
  }
  const payloadResponse = await res.json()
  const data = payloadResponse.data ?? payloadResponse
  return {
    user: data.user,
    access: data.access,
    refresh: data.refresh,
    message: data.message,
  }
}

export async function registerExaminer(payload: RegisterExaminerRequest): Promise<RegisterResponse> {
  const res = await fetch(AUTH_API.registerExaminer, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw err || new Error('Registration failed')
  }
  const payloadResponse = await res.json()
  const data = payloadResponse.data ?? payloadResponse
  return {
    user: data.user,
    access: data.access,
    refresh: data.refresh,
    message: data.message,
  }
}