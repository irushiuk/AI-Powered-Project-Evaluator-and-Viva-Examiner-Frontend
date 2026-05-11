export const API_BASE = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE : undefined) ?? '/api'

export const AUTH_API = {
  login: `${API_BASE}/auth/login/`,
  refresh: `${API_BASE}/auth/refresh/`,
  me: `${API_BASE}/auth/me/`,
  logout: `${API_BASE}/auth/logout/`,
  registerStudent: `${API_BASE}/auth/register/student/`,
}

export default {
  API_BASE,
  AUTH_API,
}
