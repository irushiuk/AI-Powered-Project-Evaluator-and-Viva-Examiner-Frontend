import { LoginResponse, RegisterResponse, RegisterStudentRequest, RegisterExaminerRequest } from '@/types/auth'
import { AUTH_API } from '@/constants/api.constant'

// All auth requests use credentials: 'include' so the backend can read/set the
// HttpOnly access + refresh cookies. Tokens are never returned in the body.

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(AUTH_API.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Login failed')
  }
  const payload = await res.json()
  const data = payload.data ?? payload
  return { user: data.user }
}

export async function refreshSession(): Promise<boolean> {
  const res = await fetch(AUTH_API.refresh, {
    method: 'POST',
    credentials: 'include',
  })
  return res.ok
}

export async function getCurrentUser() {
  const res = await fetch(AUTH_API.me, {
    credentials: 'include',
  })
  if (!res.ok) {
    const error = new Error('Failed to fetch user') as Error & { status?: number }
    error.status = res.status
    throw error
  }
  const payload = await res.json()
  // Backend returns the user inside a `data` envelope.
  return payload.data ?? payload
}

export async function logout() {
  try {
    await fetch(AUTH_API.logout, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // best-effort — cookies are cleared server-side
  }
}

export async function registerStudent(payload: RegisterStudentRequest): Promise<RegisterResponse> {
  const res = await fetch(AUTH_API.registerStudent, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (err.errors) {
      const messages = Object.entries(err.errors)
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        .join('; ')
      throw new Error(messages || err.message || 'Registration failed')
    }
    throw new Error(err.message || 'Registration failed')
  }
  const payloadResponse = await res.json()
  const data = payloadResponse.data ?? payloadResponse

  // Backend returns data: null on success (registration only, no auto-login).
  if (!data || !data.user) {
    return {
      user: null as unknown as RegisterResponse['user'],
      message: payloadResponse.message || 'Registration successful',
    }
  }

  return { user: data.user, message: data.message }
}

export async function registerExaminer(payload: RegisterExaminerRequest): Promise<RegisterResponse> {
  const res = await fetch(AUTH_API.registerExaminer, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Registration failed')
  }
  const payloadResponse = await res.json()
  const data = payloadResponse.data ?? payloadResponse
  return { user: data.user, message: data.message }
}
