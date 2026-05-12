export const API_BASE = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE : undefined) ?? '/api'

export const AUTH_API = {
  login: `${API_BASE}/auth/login/`,
  refresh: `${API_BASE}/auth/token/refresh/`,
  me: `${API_BASE}/auth/me/`,
  logout: `${API_BASE}/auth/logout/`,
  registerStudent: `${API_BASE}/auth/student/register/`,
}

export const PROJECT_API = {
  available: `${API_BASE}/projects/available/`,
  myEnrollments: `${API_BASE}/projects/my-enrollments/`,
  enroll: (projectId: string) => `${API_BASE}/projects/${projectId}/enroll/`,
  submission: (projectId: string) => `${API_BASE}/projects/${projectId}/submission/`,
  submitWork: (projectId: string) => `${API_BASE}/projects/${projectId}/submit/`,
}

export default {
  API_BASE,
  AUTH_API,
  PROJECT_API,
}
